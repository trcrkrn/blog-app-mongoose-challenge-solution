'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const{BlogPost} = require('../models');
const{app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHTTP);

function seedBlogPostData() {
    console.info('seeding blog data');
    const seedData = [];
    for (let i=1; i <= 10; i++) {
        seedData.push(generateBlogData());
    }
    return BlogPost.insertMany(seedData)
}

function generateBlogData() {
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        title: faker.lorem.words(),
        content: faker.lorem.sentences(),
        created: faker.date.past()
    };
};

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blog posts API resource', function() {
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedBlogData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    });

    //GET

    describe('GET endpoint', function() {
        it('should return all existing blog posts', function() {
            let res;
            return chai.request(app)
                .get('/posts')
                .then(function(_res) {
                    res = _res;
                    expect(res).to.have.status(200);
                    expect(res.body.blogPosts).to.have.length.of.at.least(1);
                    return BlogPost.count();
                })
                .then(function(count) {
                    expect(res.body.blogPosts).to.have.length.of(count);
                });
        });

        it('should return blog posts with right fields', function() {
            let resBlogPost;
            return chai.request(app)
                .get('/posts')
                .then(function(res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body.blogPosts).to.be.a('array');
                    expect(res.body.blogPosts).to.have.length.of.at.least(1);
                    res.body.blogPosts.forEach(function(blogPost) {
                        expect(blogPost).to.be.a('object');
                        expect(restaurant).to.include.keys('author', 'id', 'title', 'content', 'created');
                    });
                    resBlogPost = res.body.blogPosts[0];
                    return BlogPost.findById(resBlogPost.id);
                })
                .then(function(blogPost) {
                    expect(resBlogPost.id).to.equal(blogPost.id);
                    expect(resBlogPost.author).to.equal(blogPost.authorName);
                    expect(resBlogPost.title).to.equal(blogPost.title);
                    expect(resBlogPost.content).to.equal(blogPost.content);
                    expect(resBlogPost.created).to.equal(blogPost.created)
                });
        });
    });

//POST 

    describe('POST endpoint', function() {
        it ('should add a new blog post', function() {
            const newBlogPost = generateBlogData();
            let mostRecentDate;
            return chai.request(app)
                .post('/posts')
                .send(newBlogPost)
                .then(function(res) {
                    expect(res).to.have.status(201);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('object');
                    expect(res.body).to.include.keys('id','author','title', 'content', 'created');
                    expect(res.body.author).to.equal(newBlogPost.authorName);
                    expect(res.body.id).to.not.be.null;
                    expect(res.body.title).to.equal(newBlogPost.title);
                    expect(res.body.created).to.equal(newBlogPost.created);
                    return BlogPost.findById(res.body.id);
                })
                .then(function(blogPost) {
                    expect(blogPost.author).to.equal(newBlogPost.author);
                    expect(blogPost.title).to.equal(newBlogPost.title);
                    expect(blogPost.content).to.equal(newBlogPost.content)
                })
        })
    })

//PUT

    describe('PUT endpoint', function() {
        it('should update fields you send over', function() {
            const updateData = {
                author: {
                    firstName: "John",
                    lastName: "Smith"
                },
                title: "Lorem ipsum",
                content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
            };
            return BlogPost
                .findOne()
                .then(function(blogPost) {
                    updateData.id = blogPost.id;
                    return chai.request(app)
                        .put(`/posts/${blogPost.id}`)
                        .send(updateData);
                })
                .then(function(res) {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(updateData.id);
                })
                .then(function(blogPost) {
                    expect(blogPost.author).to.equal(updateData.author);
                    expect(blogPost.title).to.equal(updateData.title);
                    expect(blogPost.content).to.equal(updateData.content);
                });
        });
    });

//DELETE

    describe('DELETE endpoint', function() {
        it('should delete a blog post by id', function() {
            let blogPost;
            return BlogPost
                .findOne()
                .then(function(_blogPost) {
                    blogPost = _blogPost;
                    return chai.request(app).delete(`/posts/${blogPost.id}`);
                })
                .then(function(res) {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(blogPost.id);
                })
                .then(function(_blogPost) {
                    expect(_blogPost).to.be.null;
                });
        });
    });
});
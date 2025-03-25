module.exports = {
    PORT: 1336,
    TARGET: 'http://localhost:1337',
    IS_DOCKER_INTERNAL: process.env.IS_FORWARDED_SERVER_ON_SAME_DOCKER === '1'
};

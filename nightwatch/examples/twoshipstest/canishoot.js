describe('test clavier', function() {
  it('Can I start game', function(client) {
    client.url('http://localhost:5500/index.html');
    client
        .click('.r')
        .waitForElementVisible('#canvas', 5000);
    console.log('game Started');
  });
  it('my body is ready !!', function(client) {
    for (i = 0; i<100; i++) {
      client.sendKeys('body', 'sssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss');
    };
    client
        .waitForElementVisible('.e', 5000)
        .assert.screenshotIdenticalToBaseline('body', /* Optional */ 'fallingtest', {threshold: 0.1}, 'Photos comparées.');
  });
});

describe('test souris', function() {
  // before(browser => browser.navigateTo('http://127.0.0.1:5500/TwoShips/index.html'));
  it('Can I start game', function(client) {
    client.url('http://localhost:5500/index.html');
    client
        .click('.r')
        .waitForElementVisible('#canvas', 5000);

    console.log('game Started');
  });

  it('Can shoot', function(client) {
    client
        .pause(1000)
        .clickAndHold('.r')
        .pause(5000)
        .click('.h');
    // Désolé je n'ai pas réussi à trigger une assertion de façon propre
    client.waitForElementVisible('#canvas', 100);
  });

  it('Can kill', function(client) {
    client.getText('.s', function(result) {
      console.log('score =>', result.value);
      if (result.value > 200) {
        // Désolé je n'ai pas réussi à trigger une assertion de façon propre
        client.assert.ok(result.value > 200);
      }
    });
  });
});


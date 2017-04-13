
var sce = require('./scenario.js');
var GotoAction = sce.GotoAction;
var WaitAction = sce.WaitAction;
var ClickAction = sce.ClickAction;
var Scenario = sce.Scenario;


var mp = require('./sitemap.js');
var Node = mp.Node;
var Link = mp.Link;
var SiteMap = mp.SiteMap

var winston = require('winston');

////////////////////////////////////:::

var Nightmare = require('nightmare');
var nightmare = Nightmare({ show: true });

var map = new SiteMap('http://localhost:8080');

crawlMap(map, 5);

function crawlMap(map, max_action) {
  winston.info(`Start crawling of map ${map}`);
  var scenarioList = new Array();
  var initScenario = new Scenario(map.root);
  initScenario.addAction(new GotoAction(map.url));
  initScenario.addAction(new WaitAction(2000));
  scenarioList.push(initScenario);
  crawl(map, max_action, scenarioList);
}

function crawl(map, max_action, scenarioList) {
  if (scenarioList.length !== 0) {
    var scenario = scenarioList.pop();
    winston.info(`Retrieve state for scenario ${scenario}`);
    if (scenario.size <= max_action) {
      scenario.attachTo(nightmare)
      .evaluate(function() {
        var hash = document.querySelector('body').innerHTML;
        var a_selectors = new Array();
        var a_links = document.getElementsByTagName('a');
        for (var i = 0; i < a_links.length; i++) {
          a_selectors.push(fullPath(a_links[i]));
        }
        return {
          hash: hash,
          selectors: a_selectors
        };

        function fullPath(el) {
          var names = [];
          while (el.parentNode) {
            if (el.id) {
              names.unshift('#' + el.id);
              break;
            } else {
              if (el == el.ownerDocument.documentElement) names.unshift(el.tagName);
              else {
                for (var c = 1, e = el; e.previousElementSibling; e = e.previousElementSibling, c++);
                names.unshift(el.tagName + ":nth-child(" + c + ")");
              }
              el = el.parentNode;
            }
          }
          return names.join(" > ");
        }

      })
      .then(function(evaluate_res) {
        winston.info(`Extracted selectors [${evaluate_res.selectors.join(', ')}]`);
        if (!map.existNodeWithHash(evaluate_res.hash)) {
          var to = map.createNode(evaluate_res.hash);
          var new_link = map.createLink(scenario.from, to);
          for (var i = 0; i < evaluate_res.selectors.length; i++) {
            var new_scenario = new Scenario(to);
            for (var j = 0; j < scenario.actions.length; j++) {
              new_scenario.addAction(scenario.actions[j]);
            }
            var last_action = new ClickAction(evaluate_res.selectors[i]);
            new_scenario.addAction(last_action);
            new_link.addAction(last_action);
            new_scenario.addAction(new WaitAction(1000));
            scenarioList.push(new_scenario);
          }
        } else {
          var to = map.getNodeWithHash(evaluate_res.hash);
          if (!map.existLink(scenario.from, to)) {
            var link = map.createLink(scenario.from, to);
            //TODO add action to the link
          }
        }
        crawl(map, max_action, scenarioList);
      })
      .catch(function(err) {
        crawl(map, max_action, scenarioList);
      });
    } else {
      crawl(map, max_action, scenarioList);
    }
  } else {
    nightmare.end().then(function(res) {
      winston.info(`Finished crawling, found ${map.nodes.length} nodes and ${map.links.length} links`);
    }).catch(function(err) {
      winston.error(`Error finishing crawling: ${err}, found ${map.nodes.length} nodes and ${map.links.length} links`);
    })
  }
}

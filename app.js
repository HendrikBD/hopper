var express = require("express"),
  app = express(),
  ejs = require('ejs'),
  fs = require('fs');

var Parser = require('rss-parser'),
  parser = new Parser(),
  request = require('request');


app.set('view engine', 'ejs');
app.use(express.static('./public'));

prepIndex()

app.get('/', function(req, res){
  res.render('hopper');
})

app.get('/rss', function(req, res){
  let urls = req.query.url.split(",");
  let newestPub = 0;

  let feedsParsed = [];
  let feeds = [];

  let urlParse = urls.map(function(url){
    return new Promise(function(resolve, reject){
      request(url, function(err, response, body) {
        (async () => {
          if(body) {
            let feed = await parser.parseString(body);
            feed.rssLink = url;

            feedsParsed.push(feed);
            resolve();
          } else {
            reject("Invalid feed url")
          }
        })().catch(function(err){
          console.log("Error during http request: " + err)
          console.log("Skipping url: ", url);
          resolve();
        })
      })
    })
  })

  Promise.all(urlParse)
    .then(function(){
      let response = {};

      feedsParsed.forEach(function(feed){

        if(feed.link.slice(-1)=="/"){
          feed.link = feed.link.slice(0,-1);
        }

        feeds.push({
          title: feed.title,
          items: feed.items.sort(function(a,b){
            let dateA = new Date(a.pubDate);
            let dateB = new Date(b.pubDate);
            return (dateB-dateA)
          }),
          link: feed.rssLink,
          imgLink: "https://www.google.com/s2/favicons?domain=" + feed.link,
        });
      })

      if(feedsParsed){
        feedsParsed.forEach(function(feed){
          let date = new Date(feed.items[0].pubDate);
          if(date.valueOf()>newestPub){
            newestPub = date.valueOf();
          }
        })
      }

      if(!req.query.newestPub || newestPub>req.query.newestPub){
        response.newPub = true;
        if(req.query.returnFeeds=="true"){
          response.feeds = feeds;
        }
      } else {
        response.newPub = false;
      }
      res.status(200);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(response));
    })
    .catch(function(err){
      console.log("Error parsing rss feed: ", err)
      res.status(204).end();
    });
})


app.listen(3000, function(){
  console.log("Server started");
})


function prepIndex(){
  ejs.renderFile('views/hopper.ejs', function(err, str){

    fs.writeFile("./public/hopper.html", str, function(err) {
      if(err){
        return console.log(err);
      }
      console.log("hopper.html was compiled");
    })

  })
}

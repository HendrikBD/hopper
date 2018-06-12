var express = require("express"),
  app = express(),
  ejs = require('ejs'),
  fs = require('fs');

var Parser = require('rss-parser'),
  parser = new Parser(),
  request = require('request');

var urls = ["https://news.ycombinator.com/rss", "https://deepmind.com/blog/feed/basic"];


app.set('view engine', 'ejs');
app.use(express.static('./public'));

prepIndex()

app.get('/', function(req, res){
  prepIndex()
  res.render('hopper');
})

app.get('/rss', function(req,res){
  let feed = {one: "Heyo", two: "2"};

  request(urls[1], function(err, res2, body) {
    (async () => {
      let feed = await parser.parseString(body);
      res.status(200);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(feed));
    })()
  })

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

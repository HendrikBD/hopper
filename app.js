var express = require("express"),
  app = express();

var ejs = require('ejs'),
  fs = require('fs');

app.set('view engine', 'ejs');
app.use(express.static('./public'));

prepIndex()

app.get('/', function(req, res){
  prepIndex()
  res.render('hopper');
})

app.get('/rss', function(req,res){
  let feed = {one: "Heyo", two: "2"};

  res.status(200);
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(feed));
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

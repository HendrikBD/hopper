(function() {

  var app = {
    feedUrls: ["https://news.ycombinator.com/rss", "https://deepmind.com/blog/feed/basic"],
  }

  document.querySelector(".hamburger").addEventListener("click", function(){
    document.querySelector(".sidebar").classList.add("open");
  })
  
  document.querySelector(".sidebar .header .back").addEventListener("click", function(){
    document.querySelector(".sidebar").classList.remove("open");
  })


  app.loadFeeds = function(){

    let path = "/rss?url=";
    app.feedUrls.forEach(function(url){
      path += url;
      path +=",";
    })
    path = path.slice(0,-1);

    var request = new XMLHttpRequest();
    request.onreadystatechange = function(){
      if (request.readyState === XMLHttpRequest.DONE) {
        if(request.status === 200) {
          var response = JSON.parse(request.response);
          console.log(response);
        }
      } else {
      }
    }
    request.open('GET', path);
    request.send();
  }

  app.loadFeeds()

})();


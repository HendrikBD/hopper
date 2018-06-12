(function() {

  var app = {
    feedUrls: ["https://news.ycombinator.com/rss", "https://deepmind.com/blog/feed/basic"],
    feeds: [],
    filters: [],
  }

  document.querySelector(".hamburger").addEventListener("click", function(){
    document.querySelector(".sidebar").classList.add("open");
  })
  
  document.querySelector(".sidebar .header .back").addEventListener("click", function(){
    document.querySelector(".sidebar").classList.remove("open");
  })


  app.getFeeds = function(){

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
          app.feeds = response;
          console.log(response);
          app.updateFilters();
        }
      } else {
      }
    }
    request.open('GET', path);
    request.send();
  }

  app.updateFilters = function(){
    app.feeds.forEach(function(feed){
      app.filters.push({
        title: feed.title,
        img: undefined
      });
    })

    var filterHtml = '<div class="filter home"><img src="img/home.png"><p>Home</p></div>';
    app.filters.forEach(function(filter){
      console.log(filter)
      if(filter.img){
        filterHtml += '<div class="filter"><img src="'+filter.img+'"><p>'+filter.title+'</p></div>';
      } else {
        filterHtml += '<div class="filter"><img src="img/rssFeed.png"><p>'+filter.title+'</p></div>';
      }
    })

    document.querySelector(".sidebar .body .filters").innerHTML = filterHtml;

  }

  app.getFeeds();

})();

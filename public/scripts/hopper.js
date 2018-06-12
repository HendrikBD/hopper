(function() {

  var app = {
    feedUrls: ["https://news.ycombinator.com/rss", "https://deepmind.com/blog/feed/basic"],
    feeds: [],
    filters: [],
    recentFeeds: [],
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
          app.loadAllFeeds();
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

  app.loadAllFeeds = function(){
    app.sortRecentFeeds();

    var feedHtml = '';

    for(i=0; i<10 && i<app.recentFeeds.length; i++){
      let item = app.recentFeeds[i];
      feedHtml += '<div class="card"><div class="previewImg"><img src=""></div><div class="info"><a href="'+item.link+'" class="headline"><h2>'+ item.title +'</h2></a><div class="moreInfo"><div>'+item.source+'</div><div class="rssSource"><img src="img/rssFeed.png"></div><div class="spacing"></div><div class="timestamp">'+item.pubDate+'</div></div></div></div>'
    }
    console.log(feedHtml);
    document.querySelector(".content .feed").innerHTML = feedHtml;

  }

  app.loadFilteredFeeds = function(){
  }

  app.sortRecentFeeds = function(){
    app.recentFeeds = [];
    app.feeds.forEach(function(feed){
      feed.items.forEach(function(item){
        item.source = feed.title;
        app.recentFeeds.push(item)
      })
    })
    app.recentFeeds.sort(function(a,b){
      let dateA = new Date(a.pubDate);
      let dateB = new Date(b.pubDate);
      return (dateB-dateA)
    })
  }

  app.getFeeds();

})();

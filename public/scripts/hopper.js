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
      let timeNow = new Date();
      let pubTime = new Date(item.pubDate);

      feedHtml += '<div class="card"><div class="previewImg"><img src=""></div><div class="info"><a href="'+item.link+'" target="#" class="headline"><h2>'+ item.title +'</h2></a><div class="moreInfo"><div>'+item.source+'</div><div class="rssSource"><img src="img/rssFeed.png"></div><div class="spacing"></div><div class="timestamp">'+timeDiff(timeNow.valueOf(),pubTime.valueOf())+'</div></div></div></div>'
    }
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

function timeDiff(currTime, timeAdded){
  var diff = currTime-timeAdded;
  var diffString = "";
  if(diff<60000){
    if(Math.floor(diff/1000)<=1){
      diffString =  "1 second ago"
    } else {
      diffString =  String(Math.floor(diff/1000)) + " seconds ago"
    }
  } else if(diff<3600000){
    if(Math.floor(diff/60000)<=1){
      diffString =  "1 minute ago"
    } else {
      diffString =  String(Math.floor(diff/60000)) + " minutes ago"
    }
  } else if(diff<86400000){
    if(Math.floor(diff/3600000)<=1){
      diffString =  "1 hour ago"
    } else {
      diffString =  String(Math.floor(diff/3600000)) + " hours ago"
    }
  } else if(diff<2592000000){
    if(Math.floor(diff/86400000)<=1){
      diffString =  "1 day ago"
    } else {
      diffString =  String(Math.floor(diff/86400000)) + " days ago"
    }
  } else if(diff<31536000000){
    if(Math.floor(diff/2592000000)<=1){
      diffString =  "1 month ago"
    } else if(Math.floor(diff/2592000000)>=12) {
      diffString =  "11 months ago"
    } else {
      diffString =  String(Math.floor(diff/2592000000)) + " months ago"
    }
  } else {
    if(Math.floor(diff/31536000000)<=1){
      diffString =  "1 year ago"
    } else {
      diffString =  String(Math.floor(diff/31536000000)) + " years ago"
    }
  }
  return(diffString)
}

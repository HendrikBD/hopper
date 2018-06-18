(function() {

  var app = {
    feedUrls: [],
    reqUrls: [],
    feeds: [],
    filters: [],
    recentFeeds: [],
    currentFilter: "Home",
    numLinks: 0,
  }

  document.querySelector(".hamburger").addEventListener("click", function(){
    document.querySelector(".sidebar").classList.add("open");
  })
  
  document.querySelector(".sidebar .header .back").addEventListener("click", function(){
    document.querySelector(".sidebar").classList.remove("open");
    document.querySelector(".sidebar .filter.new").classList.remove("open");
  })

  document.querySelector(".navbar .refresh").addEventListener("click", function(){
    document.querySelector(".feed").scrollTop = 0;
    app.loadingIcon();
    app.loadFeeds();
    setTimeout(function(){
      let element = document.querySelector(".loading")
      if(element){
        element.classList.add("hide");
      }
    }, 7000)
  })

  document.querySelector(".sidebar .edit > img").addEventListener("click", function(){
    app.editFeeds();
  })


  document.querySelector(".content > .feed").addEventListener("scroll", function(){
    if((this.scrollTop+this.offsetHeight)>=this.scrollHeight){
      app.loadMore();
    }
  })


  // On load, check indexedDB for previously saved rss links, if exist save them
  app.loadFeeds = function(){
    app.reqUrls = [];
    var request = window.indexedDB.open("rssFeedLinks", 3);
    request.onerror = function(event) {
      console.log("Error: " + event.target.errorCode);
    }
    request.onsuccess = function(event){
      var db = event.target.result;
      var objStore = db.transaction("feeds", "readwrite").objectStore("feeds");
      objStore.getAll().onsuccess = function(event){
        event.target.result.forEach(function(filter){
          app.reqUrls.push(filter.url)
        })
        app.feedUrls = app.reqUrls.slice();

        app.getFeeds();
      }

    }
    request.onupgradeneeded = function(event){
      console.log("New/Updated IndexedDB ")
      var db = event.target.result;
      var objStore = db.createObjectStore("feeds", {autoIncrement: true});

      objStore.createIndex("url", "url", {unique: true});
      objStore.createIndex("title", "title", {unique: true});

      objStore.transaction.oncomplete = function(event) {
        var feedObjStore = db.transaction("feeds", "readwrite").objectStore("feeds");
        app.feeds.forEach(function(feed){
          feedObjStore.add({url: feed.link, title: feed.title})
        });
      }
      app.getFeeds();
    }

  }

  // Request feeds from server based on reqUrls property. Server will return the feed 
  // info, but if the request is empty or the urls are bad, an no content response will 
  // be returned.
  app.getFeeds = function(){
    let path = "/rss?url=";
    app.reqUrls.forEach(function(url){
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
        } else if(request.status === 204) {
          app.feeds = [];
          app.prepButtons();
          app.loadAllFeeds();
        }
      } else {
      }
    }
    request.open('GET', path);
    request.send();
    request.onerror = function(err){
      caches.match("/rss").then(function(response){
        if(response){
          response.json().then(function(json){
            app.feeds = json;
            app.updateFilters();
            app.loadAllFeeds();
          })
        }
      })
    }
  }

  // Parse feeds for filters & links, save them to indexdb and add HTML to create the filters
  app.updateFilters = function() {
    app.filters = [];
    app.feedUrls = [];

    app.feeds.forEach(function(feed){
      app.filters.push({
        title: feed.title,
        img: undefined
      });
      app.feedUrls.push(feed.link);
    })

    if(!window.indexedDB){
      console.log("Your browser doesn't support a stable version of IndexDB");
    } else {
      var request = window.indexedDB.open("rssFeedLinks", 3);

      request.onerror = function(event){
        console.log("Error: " + event.target.errorCode);
      }

      request.onsuccess = function(event){
        var db = event.target.result;
        var objStore = db.transaction("feeds", "readwrite").objectStore("feeds");
        objStore.delete(IDBKeyRange.lowerBound(0));
        app.feeds.forEach(function(feed){
          objStore.add({url:feed.link, title: feed.title});
        })
      }

      request.onupgradeneeded = function(event){
        console.log("New/Updated DB")
        var db = event.target.result;
        var objStore = db.createObjectStore("feeds", {autoIncrement: true});

        objStore.createIndex("url", "url", {unique: true});
        objStore.createIndex("title", "title", {unique: true});

        objStore.transaction.oncomplete = function(event) {
          var feedObjStore = db.transaction("feeds", "readwrite").objectStore("feeds");
          app.feeds.forEach(function(feed){
            feedObjStore.add({url: feed.link, title: feed.title})
          });
        }
      }
    }

    var filterHtml = '<div class="filter home"><div class="btn"><img src="img/home.png"><p>Home</p></div></div>';
    app.filters.forEach(function(filter){
      if(filter.img){
        filterHtml += '<div class="filter btn"><img src="'+filter.img+'"><p>'+filter.title+'</p></div>';
      } else {
        filterHtml += '<div class="filter"><div class="btn"><img src="img/rssFeed.png"><p>'+filter.title+'</p></div><div class="delete"><img src="img/delete.png"></div></div>';
      }
    })

    filterHtml += '<div class="filter new"><img src="img/plus.png"><div class="newFilter"><div><input type="text" placeholder="RSS URL"></input></div><div class="newRssSubmit">Add</div></div>';
    document.querySelector(".sidebar .body .filters").innerHTML = filterHtml;

    app.prepButtons();
  }

  // Activate new filter form
  app.newFilterForm = function(){
    document.querySelector(".filter.new").classList.toggle("open")
  }

  // Load feed data from all sources and display via HTML
  app.loadAllFeeds = function(){
    app.sortRecentFeeds();
    app.currentFilter = "Home";

    var feedHtml = '';
    let i;

    for(i=0; i<10 && i<app.recentFeeds.length; i++){
      let item = app.recentFeeds[i];
      let timeNow = new Date();
      let pubTime = new Date(item.pubDate);

      feedHtml += '<div class="card"><div class="previewImg"><img src=""></div><div class="info"><h2><a href="'+item.link+'" target="#" class="headline">'+ item.title +'</a></h2><div class="moreInfo"><div>'+item.source+'</div><div class="rssSource"><img src="img/rssFeed.png"></div><div class="spacing"></div><div class="timestamp">'+timeDiff(timeNow.valueOf(),pubTime.valueOf())+'</div></div></div></div>'
    }

    app.numLinks=i;
    document.querySelector(".content .feed").innerHTML = feedHtml;
    app.feedDisplayAnimation();
  }

  // Load feed data from a single source and display via HTML
  app.loadFilteredFeed = function(){
    let feed = app.feeds.filter(function(feed){return feed.title === app.currentFilter})
    let i;

    if(feed[0]){
      var feedHtml = '';

      for(i=0; i<10 && i<feed[0].items.length; i++){
        let item = feed[0].items[i];
        let timeNow = new Date();
        let pubTime = new Date(item.pubDate);

        feedHtml += '<div class="card"><div class="previewImg"><img src=""></div><div class="info"><h2><a href="'+item.link+'" target="#" class="headline">'+ item.title +'</a></h2><div class="moreInfo"><div>'+item.source+'</div><div class="rssSource"><img src="img/rssFeed.png"></div><div class="spacing"></div><div class="timestamp">'+timeDiff(timeNow.valueOf(),pubTime.valueOf())+'</div></div></div></div>'
      }
      app.numLinks =i;
      document.querySelector(".content .feed").innerHTML = feedHtml;
      app.feedDisplayAnimation()
    }
  }

  // Add more feed data to bottom of feed
  app.loadMore = function(){
    if(app.currentFilter=="Home"){
      var feedHtml = '';
      let i;

      for(i=app.numLinks; i<app.numLinks+10 && i<app.recentFeeds.length; i++){
        let item = app.recentFeeds[i];
        let timeNow = new Date();
        let pubTime = new Date(item.pubDate);

        feedHtml += '<div class="card"><div class="previewImg"><img src=""></div><div class="info"><a href="'+item.link+'" target="#" class="headline"><h2>'+ item.title +'</h2></a><div class="moreInfo"><div>'+item.source+'</div><div class="rssSource"><img src="img/rssFeed.png"></div><div class="spacing"></div><div class="timestamp">'+timeDiff(timeNow.valueOf(),pubTime.valueOf())+'</div></div></div></div>'
      }

      app.numLinks=i;
      document.querySelector(".content .feed").innerHTML += feedHtml;
    } else{
      let feed = app.feeds.filter(function(feed){return feed.title === app.currentFilter})
      let i;

      if(feed[0]){
        var feedHtml = '';

        for(i=app.numLinks; i<app.numLinks + 10 && i<feed[0].items.length; i++){
          let item = feed[0].items[i];
          let timeNow = new Date();
          let pubTime = new Date(item.pubDate);

          feedHtml += '<div class="card"><div class="previewImg"><img src=""></div><div class="info"><a href="'+item.link+'" target="#" class="headline"><h2>'+ item.title +'</h2></a><div class="moreInfo"><div>'+item.source+'</div><div class="rssSource"><img src="img/rssFeed.png"></div><div class="spacing"></div><div class="timestamp">'+timeDiff(timeNow.valueOf(),pubTime.valueOf())+'</div></div></div></div>'
        }
        app.numLinks =i;
        document.querySelector(".content .feed").innerHTML += feedHtml;
      }
    }
  }

  app.feedDisplayAnimation = function(){
    document.querySelectorAll(".content .feed .card").forEach(function(ele){
      ele.classList.add("display");
    })

    setTimeout(function(){
      document.querySelectorAll(".content .feed .card").forEach(function(element){
        element.classList.remove("display");
      })
    },700)
  }

  // Go through all feeds and sort them based on time submitted
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

  // Prep menu, back and new filter buttons. Menu & back are for narrow screen 
  // sidebar control. New filter button will send to app to get feeds
  app.prepButtons = function(){

    document.querySelector(".newRssSubmit").addEventListener("mousedown", function(){
      this.classList.add("clicked");
    })

    document.querySelector(".newRssSubmit").addEventListener("mouseup", function(){
      this.classList.remove("clicked");

      app.reqUrls = app.feedUrls.slice();

      var newFilter = document.querySelector(".newFilter input").value;
      if(newFilter){
        app.reqUrls.push(newFilter);
      }
      setTimeout(function(){
        document.querySelector(".newFilter input").value = "";
      },500);
      document.querySelector(".filter.new").classList.remove("open");
      app.getFeeds();
    })


    document.querySelectorAll(".filter .btn").forEach(function(element){
      element.addEventListener("click", function(){
        app.numLinks=0;
        if(app.currentFilter !== this.childNodes[1].innerText){
          app.currentFilter = this.childNodes[1].innerText;

          if(app.currentFilter==="Home"){
            app.loadAllFeeds();
          } else {
            app.loadFilteredFeed();
          }
        }
        document.querySelector(".feed").scrollTop = 0;
        document.querySelector(".sidebar").classList.remove("open");
      })
    })

    document.querySelector(".filter.new img").addEventListener("click", function(){
      app.newFilterForm();
    })

    document.querySelectorAll(".filter .delete img").forEach(function(ele){
      ele.addEventListener("click", function(){
        app.deleteFilter(this.parentNode.parentNode.childNodes[0].childNodes[1].innerText)
      })
    })
  }

  app.editFeeds = function(){
    document.querySelector(".sidebar .edit").classList.toggle("clicked")
    document.querySelectorAll(".sidebar .filter .delete").forEach(function(ele){
      ele.classList.toggle("on");
    })
  }

  app.deleteFilter = function(filter) {

    if(!window.indexedDB){
      console.log("Your browser doesn't support a stable version of IndexDB");
    } else {
      var request = window.indexedDB.open("rssFeedLinks", 3);

      request.onerror = function(event){
        console.log("Error: " + event.target.errorCode);
      }

      request.onsuccess = function(event){
        var db = event.target.result;
        var objStore = db.transaction("feeds", "readwrite").objectStore("feeds");
        objStore.delete(IDBKeyRange.lowerBound(0));
        app.feeds.forEach(function(feed){
          if(feed.title !== filter){
            objStore.add({url:feed.link, title: feed.title});
          }
        })
      }

      request.onupgradeneeded = function(event){
        console.log("New/Updated DB")
        var db = event.target.result;
        var objStore = db.createObjectStore("feeds", {autoIncrement: true});

        objStore.createIndex("url", "url", {unique: true});
        objStore.createIndex("title", "title", {unique: true});

        objStore.transaction.oncomplete = function(event) {
          var feedObjStore = db.transaction("feeds", "readwrite").objectStore("feeds");
          app.feeds.forEach(function(feed){
            if(feed.title !== filter){
              feedObjStore.add({url: feed.link, title: feed.title})
            }
          });
        }
      }
    }
    app.loadFeeds();
  }

  app.loadingIcon = function(){
    document.querySelector(".feed").innerHTML = "<div class='loading'></div>" + document.querySelector(".feed").innerHTML;
  }

  app.loadingIcon();
  app.loadFeeds();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
    .register("./hopperWorker.js")
    .then(function(){console.log("Service worker registered")})
  }

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


function delegate(selector, handler){
  return function(event){
    var targ = event.target;
    do {
      if(targ.parentNode && targ.matches(selector)) {
        handler.call(targ, event);
      }
    } while ((targ=targ.parentNode) && targ != event.currentTarget);
  }
}

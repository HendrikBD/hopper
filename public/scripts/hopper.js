(function() {

  var app = {
    feedUrls: [],
    reqUrls: [],
    feeds: [],
    filters: [],
    recentFeeds: [],
    recommended: [
      {title: "Features - Ars Technica", rssUrl: 'http://feeds.arstechnica.com/arstechnica/features', imgUrl: 'https://www.google.com/s2/favicons?domain=arstechnica.com'},
      {title: "Hacker News", rssUrl: 'http://news.ycombinator.com/rss', imgUrl: 'https://www.google.com/s2/favicons?domain=news.ycombinator.com'},
      {title: "Engadget RSS Feed", rssUrl: 'https://www.engadget.com/rss.xml', imgUrl: 'https://www.google.com/s2/favicons?domain=www.engadget.com/'},
      {title: "JavaScript", rssUrl: 'https://www.reddit.com/r/javascript/.rss', imgUrl: 'https://www.google.com/s2/favicons?domain=www.reddit.com/'},
    ],
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

  document.addEventListener("keypress", function(e){
    if(e.keyCode ==27){
      document.querySelector(".sidebar .edit").classList.remove("clicked")
      document.querySelectorAll(".sidebar .filter .delete").forEach(function(ele){
        ele.classList.remove("on");
      })
      document.querySelector(".filter.new").classList.remove("open")
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
    if(app.reqUrls.length>0) {
      let path = "/rss?url=";
      let uniqueUrls = [];

      app.reqUrls.forEach(function(url){
        if(uniqueUrls.indexOf(url)<0){
          uniqueUrls.push(url)
          path += encodeURIComponent(url);
          path +=",";
        }
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
    } else {
      app.loadAllFeeds();
    }
  }

  // Parse feeds for filters & links, save them to indexdb and add HTML to create the filters
  app.updateFilters = function() {
    app.updateDB().then(function(){

      var filterHtml = '<div class="filter home"><div class="btn"><img src="img/home.png"><p>Home</p></div></div>';

      app.feeds.forEach(function(feed){
        filterHtml += '<div class="filter"><div class="btn"><img src="'+feed.imgLink+'"><p>'+feed.title+'</p></div><div class="delete"><img src="img/delete.png"></div></div>';
      })

      filterHtml += '<div class="filter new"><img src="img/plus.png"><div class="newFilter"><div><input type="text" placeholder="RSS URL"></input></div><div class="newRssSubmit">Add</div></div>';
      document.querySelector(".sidebar .body .filters").innerHTML = filterHtml;

      document.querySelector(".sidebar .edit").classList.remove("clicked")

      app.loadRecommended();
      app.prepButtons();
    });
  }

  // Activate new filter form
  app.newFilterForm = function(){
    document.querySelector(".filter.new").classList.toggle("open")
  }

  // Load feed data from all sources and display via HTML
  app.loadAllFeeds = function(){
    app.sortRecentFeeds();
    app.currentFilter = "Home";

    let i;

    document.querySelector(".feed").innerHTML = '';

    for(i=0; i<10 && i<app.recentFeeds.length; i++){
      let item = app.recentFeeds[i];
      document.querySelector(".content .feed").insertAdjacentHTML('beforeend', app.cardHtml(item))
      app.linkCard(item);
    }

    app.numLinks=i;

    if(i>0){
      app.feedDisplayAnimation()
    } else if(app.feeds.length>0) {
      document.querySelector(".content .feed").innerHTML = "<div class='notification'><p>Error fetching feed, no items found.</p></div>";
    } else {
      document.querySelector(".content .feed").innerHTML = "<div class='notification'><p>No feeds to display, add a feed or choose a recommended one.</p></div>";
    }
  }

  // Load feed data from a single source and display via HTML
  app.loadFilteredFeed = function(){
    let feed = app.feeds.filter(function(feed){return feed.title === app.currentFilter})
    let i;


    if(feed[0]){
      document.querySelector(".content .feed").innerHTML = "";

      for(i=0; i<10 && i<feed[0].items.length; i++){
        let item = feed[0].items[i];
        document.querySelector(".content .feed").insertAdjacentHTML('beforeend', app.cardHtml(item))
        app.linkCard(item);
      }
      app.numLinks =i;
      if(i>0){
        app.feedDisplayAnimation()
      } else {
        document.querySelector(".content .feed").innerHTML = "<div class='notification'><p>No items available for this feed, refresh or try again later.</p></div>";
      }
    }
  }

  // Add more feed data to bottom of feed
  app.loadMore = function(){
    if(app.currentFilter=="Home"){
      let i;

      for(i=app.numLinks; i<app.numLinks+10 && i<app.recentFeeds.length; i++){
        let item = app.recentFeeds[i];
        document.querySelector(".content .feed").insertAdjacentHTML('beforeend', app.cardHtml(item))
        app.linkCard(item);
      }

      app.numLinks=i;
    } else{
      let feed = app.feeds.filter(function(feed){return feed.title === app.currentFilter})
      let i;

      if(feed[0]){

        for(i=app.numLinks; i<app.numLinks + 10 && i<feed[0].items.length; i++){
          let item = feed[0].items[i];
        document.querySelector(".content .feed").insertAdjacentHTML('beforeend', app.cardHtml(item))
          app.linkCard(item);
        }

        app.numLinks =i;
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
        app.recentFeeds.push(item);
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
      app.addNewFeed();
    })

    document.querySelector(".newFilter input").addEventListener("keypress", function(e){
      if(e.keyCode == 13){
        app.addNewFeed();
      }
    })


    document.querySelector(".newRssSubmit").addEventListener("mouseout", function(){
      this.classList.remove("clicked");
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
        app.deleteFeed(this.parentNode.parentNode.childNodes[0].childNodes[1].innerText)
      })
    })
  }

  app.addNewFeed = function(){
    app.reqUrls = app.feedUrls.slice();

    var newFilter = document.querySelector(".newFilter input").value;
    if(newFilter){
      app.reqUrls.push(newFilter);
    }
    setTimeout(function(){
      document.querySelector(".newFilter input").value = "";
    },500);
    document.querySelector(".filter.new").classList.remove("open");
    app.loadingIcon();
    app.getFeeds();
  }

  app.editFeeds = function(){
    document.querySelector(".sidebar .edit").classList.toggle("clicked")
    document.querySelectorAll(".sidebar .filter .delete").forEach(function(ele){
      ele.classList.toggle("on");
    })
  }

  app.deleteFeed = function(filter) {

    var res = app.feeds.filter(function(obj){
      return obj.title !== filter
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

        objStore.delete(IDBKeyRange.lowerBound(0)).onsuccess = function(){
          res.forEach(function(feed){
            objStore.add({url:feed.link, title: feed.title, imgLink: feed.imgLink});
          })
        };
      }
      request.onupgradeneeded = function(event){
        console.log("New/Updated DB")
        var db = event.target.result;
        var objStore = db.createObjectStore("feeds", {autoIncrement: true});
        objStore.createIndex("url", "url", {unique: true});
        objStore.createIndex("title", "title", {unique: true});
        objStore.transaction.oncomplete = function(event) {
          var feedObjStore = db.transaction("feeds", "readwrite").objectStore("feeds");
          res.forEach(function(feed){
            feedObjStore.add({url:feed.link, title: feed.title, imgLink: feed.imgLink});
          });
        }
      }
    }

    document.querySelectorAll(".sidebar .filter").forEach(function(ele){
      if ((ele.childNodes[0].childNodes[1]) && (ele.childNodes[0].childNodes[1].innerText == filter)){
        ele.classList.add("hide");
      }
    })

    app.feeds = res.slice();
    app.updateDB();
    if(filter==app.currentFilter || app.currentFilter=="Home"){
      app.loadAllFeeds();
    }
  }

  app.updateDB = function(){
    app.filters = [];
    app.feedUrls = [];

    app.feeds.forEach(function(feed){
      app.filters.push({
        title: feed.title,
        imgLink: feed.imgLink
      });
      app.feedUrls.push(feed.link);
    })

    var promiseDB = new Promise(function(resolve,reject){
      if(!window.indexedDB){
        console.log("Your browser doesn't support a stable version of IndexDB");
        resolve();
      } else {
        var request = window.indexedDB.open("rssFeedLinks", 3);

        request.onerror = function(event){
          console.log("Error: " + event.target.errorCode);
          resolve();
        }

        request.onsuccess = function(event){
          var db = event.target.result;
          var objStore = db.transaction("feeds", "readwrite").objectStore("feeds");
          objStore.getAll().onsuccess = function(event){
            event.target.result.forEach(function(filter){
              // If no response was received for a previously used feed
              if(app.feeds.filter(feed => feed.title==filter.title).length<1){
                app.feeds.push({
                  title: filter.title,
                  items: [],
                  link: filter.url,
                  imgLink: filter.imgLink
                });
              };
            })
            objStore.delete(IDBKeyRange.lowerBound(0)).onsuccess = function(){
              app.feeds.forEach(function(feed){
                objStore.add({url:feed.link, title: feed.title, imgLink: feed.imgLink});
              })
            };
            resolve();
          }
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
              feedObjStore.add({url:feed.link, title: feed.title, imgLink: feed.imgLink});
            });
            resolve();
          }
        }
      }
    })
    return promiseDB;
  }

  app.loadRecommended = function(){
    let filterHtml = [];
    for(let i=0; i<app.recommended.length; i++){
      let filter = app.recommended[i];
      filterHtml.push('<div class="filter"><div class="btn"><img src="'+ filter.imgUrl+'"><p>'+filter.title+'</p></div><div class="delete"><img src="img/delete.png"></div></div>')
      if(filterHtml.length>3){break}
    }
    document.querySelector(".sidebar .recommended .filters").innerHTML = filterHtml.join("");
  }

  app.loadingIcon = function(){
    document.querySelector(".feed").innerHTML = "<div class='loading'></div>" + document.querySelector(".feed").innerHTML;
  }

  app.prepButtons();
  app.loadingIcon();
  app.loadFeeds();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
    .register("./hopperWorker.js")
    .then(function(){console.log("Service worker registered")})
  }

  app.cardHtml = function(item) {
    let timeNow = new Date();
    let pubTime = new Date(item.pubDate);

    let feedHtml = '<div class="card"><div class="info"><h2>'+ item.title +'</h2><div class="moreInfo"><div>'+item.source+'</div><div class="rssSource"></div><div class="spacing"></div><div class="timestamp">'+timeDiff(timeNow.valueOf(),pubTime.valueOf())+'</div></div></div></div>';

    return feedHtml;
  }

  app.linkCard = function(item) {
    var eleList = document.querySelectorAll(".content .feed .card");
    eleList[eleList.length-1].addEventListener("click", function(){
      let win = window.open(item.link, '_blank');
      if(win){
        win.focus();
      } else {
        console.log("Link blocked, allow popups to view content");
      }
    });
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

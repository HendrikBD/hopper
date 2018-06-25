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
      {title: "CSS-Tricks", rssUrl: 'https://css-tricks.com/feed/', imgUrl: 'https://www.google.com/s2/favicons?domain=www.css-tricks.com/'},
      {title: "Engadget RSS Feed", rssUrl: 'https://www.engadget.com/rss.xml', imgUrl: 'https://www.google.com/s2/favicons?domain=www.engadget.com/'},
      {title: "Reuters: World News", rssUrl: 'http://feeds.reuters.com/reuters/AFRICAWorldNews', imgUrl: 'https://www.google.com/s2/favicons?domain=www.reuters.com/'},
      {title: "LifeHacker", rssUrl: 'https://lifehacker.com/rss', imgUrl: 'https://www.google.com/s2/favicons?domain=www.lifehacker.com/'},
      {title: "TechCrunch", rssUrl: 'http://feeds.feedburner.com/TechCrunch', imgUrl: 'https://www.google.com/s2/favicons?domain=www.techcrunch.com/'},
      {title: "Wait But Why", rssUrl: 'https://waitbutwhy.com/feed', imgUrl: 'https://www.google.com/s2/favicons?domain=www.waitbutwhy.com/'},
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

  document.querySelectorAll(".btn").forEach(function(ele){
    ele.addEventListener("click", function(){
      this.classList.toggle("clicked");
    })
  })

  document.querySelector(".sidebar .edit > img").addEventListener("click", function(){
    app.editFeeds();
  })


  document.querySelector(".content .main").addEventListener("scroll", function(){
    if((this.scrollTop+this.offsetHeight)>=this.scrollHeight){
      app.loadMore();
    }
  })

  document.addEventListener("keydown", function(e){
    if(e.keyCode ==27){
      document.querySelectorAll(".sidebar .btns .btn").forEach(function(ele){
        ele.classList.remove("clicked");
      });
      document.querySelector(".sidebar .options").classList.remove("recommended");

      document.querySelectorAll(".sidebar .filters .filter .feedImg").forEach(function(ele){
        ele.classList.remove("delete");
      })
      document.querySelector(".filter.new").classList.remove("open")
    }
  })

  document.querySelector(".sidebar .btns .rss img").addEventListener("click", function(){
    document.querySelector(".sidebar .options").classList.toggle("recommended");
    app.loadRecommended();
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

        app.getFeeds(true, true);
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
      app.getFeeds(true, true);
    }
  }

  // Request feeds from server based on reqUrls property. Server will return the feed 
  // info, but if the request is empty or the urls are bad, an no content response will 
  // be returned.
  app.getFeeds = function(checkPubTime, returnFeeds){
    if(app.reqUrls.length>0) {
      let path = "/rss?url=";
      let uniqueUrls = [];
      var newestPub = app.getMostRecent();

      app.reqUrls.forEach(function(url){
        if(uniqueUrls.indexOf(url)<0){
          uniqueUrls.push(url)
          path += encodeURIComponent(url);
          path +=",";
        }
      })

      path = path.slice(0,-1);
      if(newestPub && checkPubTime){
        path += "&newestPub=";
        path += String(app.getMostRecent());
      }

      path += "&returnFeeds=";
      if(returnFeeds){
        path += "true";
      } else {
        path += "false";
      }

      var request = new XMLHttpRequest();
      request.onreadystatechange = function(){
        if (request.readyState === XMLHttpRequest.DONE) {
          if(request.status === 200) {
            var response = JSON.parse(request.response);
            if(response.feeds){
              app.feeds = response.feeds;
              app.updateFilters();
              app.loadAllFeeds();

              app.prepFeedCheck()
              document.querySelector(".refresh img:nth-child(2)").classList.remove("on");

            } else if(response.newPub){

              clearInterval(app.periodicCheck)
              app.periodicCheck = undefined;

              document.querySelector(".refresh img:nth-child(2)").classList.add("on");
              console.log("Newely published links!")
              document.querySelector(".loading").classList.add(".hide");
            } else if(response.newPub===false){
              console.log("Nothing new")
            } else {
              console.log("There may be a problem, response: ", response);
            }

          } else if(request.status === 204) {
            app.feeds = [];
            app.updateFilters();
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
      app.updateFilters();
      app.loadAllFeeds();
    }
  }


  // Parse feeds for filters & links, save them to indexdb and add HTML to create the filters
  app.updateFilters = function() {
    app.updateDB().then(function(){

      var filtersDOM = document.querySelector(".sidebar .body>.filters");
      filtersDOM.innerHTML = '<div class="filter home"><div class="btn"><img src="img/home.png"><p>Home</p></div></div>';
        filtersDOM.childNodes[filtersDOM.childNodes.length-1].childNodes[0].addEventListener("click", function(){
          document.querySelector(".sidebar").classList.remove("open");
          app.currentFilter = "Home";
          app.loadAllFeeds();
        })

      app.feeds.forEach(function(feed){
        filtersDOM.insertAdjacentHTML('beforeend', '<div class="filter" rssUrl="'+feed.link+'"><div class="btn"><div class="feedImg"><img src="'+feed.imgLink+'" class="rssImg"><img src="img/delete.png" class="del"></div><p>'+feed.title+'</p></div></div>')

        filtersDOM.childNodes[filtersDOM.childNodes.length-1].childNodes[0].childNodes[0].childNodes[0].addEventListener("click", function(){
          document.querySelector(".sidebar").classList.remove("open");
          app.currentFilter = feed.link;
          app.loadFilteredFeed();
        })

        filtersDOM.childNodes[filtersDOM.childNodes.length-1].childNodes[0].childNodes[1].addEventListener("click", function(){
          document.querySelector(".sidebar").classList.remove("open");
          app.currentFilter = feed.link;
          app.loadFilteredFeed();
        })

        filtersDOM.childNodes[filtersDOM.childNodes.length-1].childNodes[0].childNodes[0].childNodes[1].addEventListener("click", function(){
          app.deleteFeed(feed.link)
        })

      })

      filtersDOM.insertAdjacentHTML('beforeend', '<div class="filter new"><img src="img/plus.png"><div class="newFilter"><div><input type="text" placeholder="RSS URL"></input></div><div class="newRssSubmit">Add</div></div>');
      document.querySelector(".sidebar .edit").classList.remove("clicked")
      document.querySelector(".filter.new img").addEventListener("click", function(){
        app.newFilterForm();
      })

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
    document.querySelector(".msg .loading").classList.add("hide");
  }

  // Load feed data from a single source and display via HTML
  app.loadFilteredFeed = function(){
    let feed = app.feeds.filter(function(feed){return feed.link === app.currentFilter})
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
        document.querySelector(".feed").scrollTop = 0;
      } else {
        document.querySelector(".content .feed").innerHTML = "<div class='notification'><p>No items available for this feed, refresh or try again later.</p></div>";
      }
    }
    document.querySelector(".msg .loading").classList.add("hide");
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
      let feed = app.feeds.filter(function(feed){return feed.link === app.currentFilter})
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
  }

  app.addNewFeed = function(){
    app.reqUrls = app.feedUrls.slice();

    var newFilter = document.querySelector(".newFilter input").value;
    if(newFilter){app.reqUrls.push(newFilter)}
    setTimeout(function(){document.querySelector(".newFilter input").value = ""}, 500);
    document.querySelector(".filter.new").classList.remove("open");
    app.loadingIcon();
    app.getFeeds(false, true);
  }

  app.editFeeds = function(){
    document.querySelectorAll(".sidebar .filters .filter .feedImg").forEach(function(ele){
      ele.classList.toggle("delete");
    })
  }

  app.deleteFeed = function(filter) {
    var res = app.feeds.filter(function(obj){
      return obj.link !== filter
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

    document.querySelectorAll(".sidebar .body>div:nth-child(1) .filter").forEach(function(ele){
      if ((ele.attributes.rssurl) && (ele.attributes.rssurl.value == filter)){
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
    let numFilters = 0;
    document.querySelector(".sidebar .options").innerHTML = "<h3>Recommended Feeds</h3>";

    for(let i=0; i<app.recommended.length; i++){
      let filter = app.recommended[i];

      if(app.feeds.filter(function(feed){return (feed.link==filter.rssUrl)}).length==0){

        let filterHtml = '<div class="filter"><div class="btn"><img src="'+ filter.imgUrl+'"><p>'+filter.title+'</p></div></div>';


        document.querySelector(".sidebar .options").insertAdjacentHTML('beforeend', filterHtml);

        let filterList = document.querySelectorAll(".sidebar .options .filter"); 
        filterList[filterList.length-1].addEventListener('click', function(e){
          app.reqUrls = app.feedUrls.slice();
          app.reqUrls.push(filter.rssUrl);
          document.querySelector(".newFilter input").value = "";
          document.querySelector(".filter.new").classList.remove("open");
          app.loadingIcon();
          app.getFeeds(false, true);
          app.loadRecommended();
        })
        numFilters ++;
      }

      if(numFilters>3){break}
    }
  }

  app.getMostRecent = function(){
    app.sortRecentFeeds();
    if(app.recentFeeds[0]){
      var dateNewestPub = new Date(app.recentFeeds[0].pubDate);
      return dateNewestPub.valueOf()
    } else {
      return undefined
    }
  }


  app.loadingIcon = function(){
    document.querySelector(".msg .loading").classList.remove("hide");
    setTimeout(function(){
      document.querySelector(".msg .loading").classList.add("hide");
    }, 30000)
  };

  app.prepFeedCheck = function(){
    if(!app.periodicCheck){
      app.periodicCheck = setInterval(function(){
        console.log("Checking for new feed data");
        app.getFeeds(true, false);
      }, 120000);
    }
  }

  app.prepButtons();
  app.loadingIcon();
  app.loadFeeds();
  app.prepFeedCheck();

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

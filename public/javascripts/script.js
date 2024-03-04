function getLatency() {
    var started = new Date().getTime();
    var url = "/data?t=" + +new Date();
    fetch(url)
      .then(function (response) {
        var ended = new Date().getTime();
        var milliseconds = ended - started;
        document.getElementById("latency").innerHTML = milliseconds + " ms";
      })
      .catch(function (error) {
        document.getElementById("latency").innerHTML = "? ms";
      });
  }


  document.addEventListener("DOMContentLoaded", () => {
    const date = new Date("2024-03-26");
    document.getElementById("date").innerHTML = "26th March, 2024";
    getVisitorInfos();
    var timerLatency = window.setInterval(getLatency, 1000);
  });
  async function getVisitorInfos() {
    if (localStorage.getItem("visitorInfos") == null) {
      var visitorInfos = null;

      await fetch("https://ipinfo.io/json")
        .then(async function (response) {
          visitorInfos = await response.json();
          localStorage.setItem("visitorInfos", JSON.stringify(visitorInfos));
        })
        .catch(function (error) {
          console.log(error);
        });
    } else {
      visitorInfos = JSON.parse(localStorage.getItem("visitorInfos"));
    }

    //console.log(visitorInfos);
    document.getElementById("temp").innerHTML = "0 Degrees";
    document.getElementById("weather").innerHTML = "Sunny";
  }

  //set the host
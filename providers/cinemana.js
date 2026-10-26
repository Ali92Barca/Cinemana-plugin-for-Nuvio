```js
// providers/cinemana.js

const BASE = "https://cinemana.shabakaty.com";
const TMDB = "https://api.themoviedb.org/3";

function getJson(url) {
  return fetch(url).then(function (response) {
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    return response.json();
  });
}

function getItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.info)) return data.info;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.videos)) return data.videos;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    var apiKey = __get_tmdb_api_key();

    if (!apiKey) {
      throw new Error("TMDB API key is unavailable");
    }

    var kind = mediaType === "series" || mediaType === "tv"
      ? "tv"
      : "movie";

    var details = await getJson(
      TMDB + "/" + kind + "/" + encodeURIComponent(tmdbId) +
      "?api_key=" + encodeURIComponent(apiKey)
    );

    var title = details.title || details.name ||
      details.original_title || details.original_name;

    if (!title) {
      throw new Error("TMDB title not found");
    }

    console.log("Cinemana search title:", title);

    var params = new URLSearchParams({
      level: "0",
      videoTitle: title,
      staffTitle: "",
      page: "0",
      year: "1900,2026",
      type: kind === "tv" ? "series" : "movies"
    });

    var data = await getJson(
      BASE + "/api/android/AdvancedSearch?" + params.toString() + "&"
    );

    var items = getItems(data);
    var wanted = normalizeTitle(title);

    var matches = items.filter(function (item) {
      var names = [
        item.en_title,
        item.ar_title,
        item.other_title,
        item.title
      ];

      return names.some(function (name) {
        var normalized = normalizeTitle(name);
        return normalized && (
          normalized === wanted ||
          normalized.indexOf(wanted) !== -1 ||
          wanted.indexOf(normalized) !== -1
        );
      });
    });

    console.log(
      "Cinemana search results:", items.length,
      "title matches:", matches.length
    );

    // Temporary diagnostic result: no stream URLs yet.
    return [];
  } catch (error) {
    console.log("Cinemana provider:", error.message || error);
    return [];
  }
}

module.exports = { getStreams };
```


const BASE = "https://cinemana.shabakaty.com";

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

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

function searchCinemana(title, type, page) {
  var params = new URLSearchParams({
    level: "0",
    videoTitle: title,
    staffTitle: "",
    page: String(page || 0),
    year: "1900,2026",
    type: String(type)
  });

  return getJson(
    BASE + "/api/android/AdvancedSearch?" + params.toString() + "&"
  );
}

function getStreams(tmdbId, mediaType, season, episode) {
  return Promise.resolve().then(function () {
    // The Nuvio provider API supplies TMDB ID, not the title.
    // We need TMDB details to obtain the title for Cinemana search.
    throw new Error(
      "TMDB title lookup must be configured before searching Cinemana."
    );
  }).catch(function (error) {
    console.log("Cinemana provider:", error.message);
    return [];
  });
}

module.exports = { getStreams };

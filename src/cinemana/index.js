
const BASE = "https://cinemana.shabakaty.com";

function getJson(url) {
  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error("Cinemana HTTP " + response.status);
      }
      return response.json();
    });
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const type = mediaType === "movie" ? "movies" : "series";
    const detailsUrl =
      "https://api.themoviedb.org/3/" +
      (mediaType === "movie" ? "movie/" : "tv/") +
      encodeURIComponent(tmdbId);

    // TMDB lookup will be added after configuring the API key.
    console.log("Cinemana request:", mediaType, tmdbId, season, episode);

    return [];
  } catch (error) {
    console.error("Cinemana:", error.message);
    return [];
  }
}

module.exports = { getStreams };


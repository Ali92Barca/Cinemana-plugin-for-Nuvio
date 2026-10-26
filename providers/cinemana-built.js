// providers/cinemana.js
function getStreams(tmdbId, mediaType, season, episode) {
  return Promise.resolve().then(function() {
    throw new Error(
      "TMDB title lookup must be configured before searching Cinemana."
    );
  }).catch(function(error) {
    console.log("Cinemana provider:", error.message);
    return [];
  });
}
module.exports = { getStreams };

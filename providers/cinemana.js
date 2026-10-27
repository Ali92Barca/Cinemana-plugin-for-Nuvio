
const BASE = "http://127.0.0.1:7001";
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
  if (!data || typeof data !== "object") return [];

  const keys = [
    "info",
    "results",
    "videos",
    "data",
    "seasons",
    "episodes",
    "items"
  ];

  for (const key of keys) {
    const value = data[key];

    if (Array.isArray(value)) return value;

    if (value && typeof value === "object") {
      for (const nestedKey of keys) {
        if (Array.isArray(value[nestedKey])) {
          return value[nestedKey];
        }
      }
    }
  }

  return [];
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function itemId(item) {
  return item?.nb ??
    item?.id ??
    item?.videoId ??
    item?.video_id ??
    null;
}

function titleNames(item) {
  return [
    item?.en_title,
    item?.ar_title,
    item?.other_title,
    item?.original_title,
    item?.title,
    item?.name
  ].filter(Boolean);
}

function titleScore(item, wanted) {
  let best = 0;

  for (const name of titleNames(item)) {
    const candidate = normalizeTitle(name);

    if (!candidate || !wanted) continue;

    if (candidate === wanted) {
      best = Math.max(best, 100);
    } else if (
      candidate.length >= 4 &&
      wanted.length >= 4 &&
      (candidate.includes(wanted) ||
       wanted.includes(candidate))
    ) {
      best = Math.max(best, 60);
    }
  }

  return best;
}

async function searchCinemana(title, type, year) {
  const params = new URLSearchParams({
    level: "0",
    videoTitle: title,
    staffTitle: "",
    page: "0",
    year: "1900,2026",
    type: type === "tv" ? "series" : "movies"
  });

  const data = await getJson(
    BASE + "/api/android/AdvancedSearch?" +
    params.toString() + "&"
  );

  const wanted = normalizeTitle(title);

  return getItems(data)
    .map(function (item) {
      let score = titleScore(item, wanted);

      const itemYear = Number(
        String(
          item?.release_date ||
          item?.year ||
          item?.releaseYear ||
          ""
        ).slice(0, 4)
      );

      if (year && itemYear && year === itemYear) {
        score += 15;
      } else if (
        year &&
        itemYear &&
        Math.abs(year - itemYear) > 1
      ) {
        score -= 10;
      }

      return { item, score };
    })
    .filter(function (entry) {
      return entry.score >= 60 &&
        itemId(entry.item) != null;
    })
    .sort(function (a, b) {
      return b.score - a.score;
    })
    .map(function (entry) {
      return entry.item;
    });
}

async function getVideoStreams(id) {
  const data = await getJson(
    BASE + "/api/android/transcoddedFiles/id/" +
    encodeURIComponent(id)
  );

  const versions = getItems(data);

  return versions
    .filter(function (version) {
      return typeof version?.videoUrl === "string" &&
        /^https?:\/\//i.test(version.videoUrl);
    })
    .map(function (version) {
      return {
        name: "Cinemana",
        title:
          (version.resolution ||
           version.transcoddedFileName ||
           "Video") +
          " · " +
          (version.container || "MP4"),
        url: version.videoUrl,
        behaviorHints: {
          notWebReady: false
        }
      };
    });
}

function getSeasonNumber(item) {
  return Number(
    item?.season ??
    item?.seasonNumber ??
    item?.season_number ??
    item?.seasonNo ??
    item?.season_number_id
  );
}

function getEpisodeNumber(item) {
  return Number(
    item?.episodeNummer ??
    item?.episode ??
    item?.episodeNumber ??
    item?.episode_number ??
    item?.episodeNo ??
    item?.number
  );
}

async function getEpisodeId(series, season, episode) {
  const rootId =
    series?.rootSeries ??
    series?.root_series ??
    itemId(series);

  if (rootId == null) return null;

  const data = await getJson(
    BASE + "/api/android/videoSeason/id/" +
    encodeURIComponent(rootId)
  );

  const episodes = getItems(data);

  console.log(
    "Cinemana: season response count:",
    episodes.length
  );

  const wantedSeason = Number(season);
  const wantedEpisode = Number(episode);

  const match = episodes.find(function (item) {
    const itemSeason = getSeasonNumber(item);
    const itemEpisode = getEpisodeNumber(item);

    return itemSeason === wantedSeason &&
      itemEpisode === wantedEpisode;
  });

  if (!match) {
    console.log(
      "Cinemana: episode not matched",
      wantedSeason,
      wantedEpisode,
      episodes.slice(0, 3)
    );
    return null;
  }

  return itemId(match);
}

async function getStreams(
  tmdbId,
  mediaType,
  season,
  episode
) {
  try {
    const apiKey = __get_tmdb_api_key();

    if (!apiKey) {
      throw new Error("TMDB API key is unavailable");
    }

    const kind =
      mediaType === "series" || mediaType === "tv"
        ? "tv"
        : "movie";

    const details = await getJson(
      TMDB + "/" + kind + "/" +
      encodeURIComponent(tmdbId) +
      "?api_key=" + encodeURIComponent(apiKey)
    );

    const title =
      details.title ||
      details.name ||
      details.original_title ||
      details.original_name;

    if (!title) {
      throw new Error("TMDB title not found");
    }

    const yearText = (
      details.release_date ||
      details.first_air_date ||
      ""
    ).slice(0, 4);

    const year = Number(yearText) || null;

    let candidates = await searchCinemana(
      title,
      kind,
      year
    );

    const originalTitle =
      details.original_title ||
      details.original_name;

    if (
      !candidates.length &&
      originalTitle &&
      originalTitle !== title
    ) {
      candidates = await searchCinemana(
        originalTitle,
        kind,
        year
      );
    }

    if (!candidates.length) {
      console.log(
        "Cinemana: no matching title found:",
        title
      );
      return [];
    }

    for (const candidate of candidates.slice(0, 3)) {
      let videoId = itemId(candidate);

      if (kind === "tv") {
        videoId = await getEpisodeId(
          candidate,
          season,
          episode
        );

        if (videoId == null) continue;
      }

      const streams = await getVideoStreams(videoId);

      if (streams.length) return streams;
    }

    console.log(
      "Cinemana: no playable streams found:",
      title
    );

    return [];
  } catch (error) {
    console.log(
      "Cinemana provider:",
      error?.message || error
    );
    return [];
  }
}

module.exports = { getStreams };

export default function handler(req, res) {
  const tmdbReady = !!(process.env.TMDB_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY);
  const playerReady = !!(process.env.PLAYER_EMBED_URL && process.env.PLAYER_ALLOWED_ORIGINS);
  res.status(200).json({
    tmdbReady,
    playerConfigured: playerReady,
    liveChannelCount: 0,
    contentMode: "json",
    commentsEnabled: false,
    turnstileSiteKey: null
  });
}

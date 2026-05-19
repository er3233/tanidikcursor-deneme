/**
 * TANIDIK — Experimental UI layer (demo only). Does not modify app.js.
 */
(function () {
  const SUPABASE_URL = "https://gbzmqlamuimtiunofgxu.supabase.co";
  const SUPABASE_KEY =
    "sb_publishable_RWnWRlA_Do1Yb4N9uibZkA_nr1RMx7f";

  const CURATED_LIMIT = 6;
  const EL = String.fromCharCode(100, 105, 118);
  let venueStatsCache = {};
  let venueNameToId = {};

  function safeText(value) {
    return value == null ? "" : String(value);
  }

  function formatReviewDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  function getMapQuery(venue) {
    if (!venue) return "";
    const lat = venue.latitude ?? venue.lat;
    const lng = venue.longitude ?? venue.lng;
    if (
      lat != null &&
      lng != null &&
      Number.isFinite(Number(lat)) &&
      Number.isFinite(Number(lng))
    ) {
      return `${lat},${lng}`;
    }
    const parts = [venue.address, venue.city, venue.name].filter(Boolean);
    return parts.join(", ");
  }

  function buildVenueStats(venueIds, reviews, favorites) {
    const statsById = {};
    venueIds.forEach((id) => {
      statsById[String(id)] = {
        reviewCount: 0,
        averageRating: 0,
        favoriteCount: 0,
      };
    });

    (reviews || []).forEach((review) => {
      const venueId = String(review.venue_id);
      if (!statsById[venueId]) return;
      statsById[venueId].reviewCount += 1;
      statsById[venueId].averageRating += Number(review.rating || 0);
    });

    Object.keys(statsById).forEach((venueId) => {
      const stats = statsById[venueId];
      if (stats.reviewCount > 0) {
        stats.averageRating /= stats.reviewCount;
      }
    });

    (favorites || []).forEach((favorite) => {
      const venueId = String(favorite.venue_id);
      if (!statsById[venueId]) return;
      statsById[venueId].favoriteCount += 1;
    });

    return statsById;
  }

  async function loadVenueStatsCache(client) {
    const { data: venues, error: venueError } = await client
      .from("venues")
      .select("id, name");

    if (venueError) {
      console.log(venueError);
      return;
    }

    venueNameToId = {};
    const venueIds = [];

    (venues || []).forEach((venue) => {
      venueIds.push(venue.id);
      venueNameToId[safeText(venue.name).trim()] = venue.id;
    });

    if (venueIds.length === 0) return;

    const [reviewsResult, favoritesResult] = await Promise.all([
      client.from("venue_reviews").select("venue_id, rating"),
      client.from("favorites").select("venue_id"),
    ]);

    venueStatsCache = buildVenueStats(
      venueIds,
      reviewsResult.data || [],
      favoritesResult.data || []
    );
  }

  function getCardScore(venueId) {
    const stats = venueStatsCache[String(venueId)];
    if (!stats) return 0;
    const ratingScore = stats.reviewCount
      ? stats.averageRating * 100
      : 0;
    return (
      ratingScore +
      stats.favoriteCount * 12 +
      stats.reviewCount * 4
    );
  }

  function parseCardScoreFromDom(card) {
    let rating = 0;
    let favoriteCount = 0;
    let hasReviews = false;

    card.querySelectorAll(".venue-stat-badge").forEach((badge) => {
      const text = badge.textContent || "";
      const ratingMatch = text.match(/([\d.]+)\s*\/\s*5/);
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[1]) || 0;
        hasReviews = true;
      }
      const favoriteMatch = text.match(/^(\d+)\s+favorite/i);
      if (favoriteMatch) {
        favoriteCount = parseInt(favoriteMatch[1], 10) || 0;
      }
    });

    return (
      (hasReviews ? rating * 100 : 0) +
      favoriteCount * 12
    );
  }

  function annotateVenueCards(container) {
    container.querySelectorAll(".venue-card").forEach((card) => {
      if (card.dataset.venueId) return;
      const name = card.querySelector("h2")?.textContent?.trim();
      if (name && venueNameToId[name] != null) {
        card.dataset.venueId = String(venueNameToId[name]);
      }
    });
  }

  function curateHomeVenues() {
    const container = document.getElementById("venuesContainer");
    const footer = document.getElementById("homeVenuesFooter");
    const hint = document.getElementById("homeVenuesHint");

    if (!container || !document.getElementById("homeSocialProof")) {
      return;
    }

    if (container.querySelector(".empty-state")) {
      if (footer) footer.hidden = true;
      return;
    }

    annotateVenueCards(container);

    const cards = [...container.querySelectorAll(".venue-card")];
    if (cards.length === 0) {
      if (footer) footer.hidden = true;
      return;
    }

    const scored = cards.map((card, index) => {
      const venueId = card.dataset.venueId;
      const score = venueId
        ? getCardScore(venueId)
        : parseCardScoreFromDom(card);
      return { card, score, index };
    });

    scored.sort((a, b) => b.score - a.score || a.index - b.index);

    const hasRankingSignal = scored.some((item) => item.score > 0);
    const keepSet = new Set(
      scored.slice(0, CURATED_LIMIT).map((item) => item.card)
    );

    cards.forEach((card) => {
      const visible = keepSet.has(card);
      card.hidden = !visible;
      card.classList.toggle("venue-card--curated-hidden", !visible);
    });

    const total = cards.length;
    const visibleCount = Math.min(CURATED_LIMIT, total);

    if (footer) {
      footer.hidden = total <= CURATED_LIMIT;
    }

    if (!hint) return;

    if (!hasRankingSignal && total > CURATED_LIMIT) {
      hint.textContent = `Preview · showing ${visibleCount} of ${total} venues`;
      return;
    }

    if (total > CURATED_LIMIT) {
      hint.textContent = `Top ${visibleCount} of ${total} matching venues`;
      return;
    }

    hint.textContent =
      visibleCount === 1
        ? "1 curated pick for tonight"
        : `${visibleCount} curated picks for tonight`;
  }

  function setupHomeVenueCuration() {
    const container = document.getElementById("venuesContainer");
    if (!container) return;

    const observer = new MutationObserver(() => {
      curateHomeVenues();
    });

    observer.observe(container, { childList: true });
    curateHomeVenues();
  }

  async function loadHomeSocialProof(client) {
    const list = document.getElementById("homeSocialProof");
    if (!list) return;

    list.innerHTML =
      '<p class="page-message">Loading community reviews…</p>';

    const { data: reviews, error } = await client
      .from("venue_reviews")
      .select("id, rating, review, created_at, venue_id")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      list.innerHTML =
        '<p class="page-message">Reviews will appear as the community grows.</p>';
      return;
    }

    if (!reviews || reviews.length === 0) {
      list.innerHTML =
        '<p class="page-message">No reviews yet — be the first on a venue page.</p>';
      return;
    }

    const venueIds = [
      ...new Set(reviews.map((review) => review.venue_id).filter(Boolean)),
    ];
    const venueNames = {};

    if (venueIds.length > 0) {
      const { data: venues } = await client
        .from("venues")
        .select("id, name")
        .in("id", venueIds);
      (venues || []).forEach((venue) => {
        venueNames[venue.id] = venue.name;
      });
    }

    list.innerHTML = "";
    reviews.forEach((review) => {
      const card = document.createElement("article");
      card.className = "review-card";

      const header = document.createElement(EL);
      header.className = "review-card-header";

      const rating = document.createElement("span");
      rating.className = "review-rating";
      rating.textContent = `${review.rating} / 5`;
      header.appendChild(rating);

      const date = document.createElement("span");
      date.className = "review-date";
      date.textContent = formatReviewDate(review.created_at);
      header.appendChild(date);

      const text = document.createElement("p");
      text.textContent = safeText(review.review);

      const venueLabel = document.createElement("p");
      venueLabel.className = "home-social-proof__venue";
      const name = venueNames[review.venue_id];
      venueLabel.textContent = name ? `at ${name}` : "Venue review";

      card.appendChild(header);
      card.appendChild(text);
      card.appendChild(venueLabel);
      list.appendChild(card);
    });
  }

  function pickSpotlightVenue(venues) {
    const withLocation = (venues || []).filter((venue) => getMapQuery(venue));
    if (withLocation.length === 0) return null;

    return withLocation
      .map((venue) => ({
        venue,
        score: getCardScore(venue.id),
      }))
      .sort((a, b) => b.score - a.score)[0].venue;
  }

  async function loadHomeMapTeaser(client) {
    const section = document.getElementById("homeMapSection");
    const map = document.getElementById("homeMapEmbed");
    const hint = document.getElementById("homeMapHint");
    const link = document.getElementById("homeMapLink");

    if (!section || !map) return;

    const { data: venues, error } = await client.from("venues").select("*");

    if (error || !venues || venues.length === 0) {
      if (hint) {
        hint.textContent =
          "Add venues with an address or coordinates to preview the map.";
      }
      section.style.display = "none";
      return;
    }

    const spotlight = pickSpotlightVenue(venues);
    if (!spotlight) {
      if (hint) {
        hint.textContent =
          "Venues need a city or address for the map preview.";
      }
      section.style.display = "none";
      return;
    }

    const query = getMapQuery(spotlight);
    const encoded = encodeURIComponent(query);

    if (hint) {
      hint.textContent = `Spotlight: ${safeText(spotlight.name)}${spotlight.city ? ` · ${spotlight.city}` : ""}`;
    }

    map.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
    map.title = `${safeText(spotlight.name)} location`;

    if (link) {
      link.href = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
      link.style.display = "";
    }
  }

  async function init() {
    if (!document.body.classList.contains("ui-experiment")) return;

    const client = window.supabase?.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );
    if (!client) return;

    await loadVenueStatsCache(client);
    setupHomeVenueCuration();
    loadHomeSocialProof(client);
    loadHomeMapTeaser(client);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

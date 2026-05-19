/**
 * TANIDIK — Experimental UI merge (demo only).
 * Additive script: homepage social proof + map teaser. Does not modify app.js.
 */
(function () {
  const SUPABASE_URL = "https://gbzmqlamuimtiunofgxu.supabase.co";
  const SUPABASE_KEY =
    "sb_publishable_RWnWRlA_Do1Yb4N9uibZkA_nr1RMx7f";

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
      ...new Set(reviews.map((r) => r.venue_id).filter(Boolean)),
    ];
    let venueNames = {};

    if (venueIds.length > 0) {
      const { data: venues } = await client
        .from("venues")
        .select("id, name")
        .in("id", venueIds);
      (venues || []).forEach((v) => {
        venueNames[v.id] = v.name;
      });
    }

    list.innerHTML = "";
    reviews.forEach((review) => {
      const card = document.createElement("article");
      card.className = "review-card";

      const header = document.createElement("\u0064iv");
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
      venueLabel.textContent = name
        ? `at ${name}`
        : "Venue review";

      card.appendChild(header);
      card.appendChild(text);
      card.appendChild(venueLabel);
      list.appendChild(card);
    });
  }

  async function loadHomeMapTeaser(client) {
    const section = document.getElementById("homeMapSection");
    const map = document.getElementById("homeMapEmbed");
    const hint = document.getElementById("homeMapHint");
    const link = document.getElementById("homeMapLink");

    if (!section || !map) return;

    const { data: venues, error } = await client
      .from("venues")
      .select("*")
      .limit(20);

    if (error || !venues || venues.length === 0) {
      if (hint) {
        hint.textContent =
          "Add venues with an address or coordinates to preview the map.";
      }
      section.style.display = "none";
      return;
    }

    const withLocation = venues.find((v) => getMapQuery(v));
    if (!withLocation) {
      if (hint) {
        hint.textContent =
          "Venues need a city or address for the map preview.";
      }
      section.style.display = "none";
      return;
    }

    const query = getMapQuery(withLocation);
    const encoded = encodeURIComponent(query);

    if (hint) {
      hint.textContent = `Spotlight: ${safeText(withLocation.name)}${withLocation.city ? ` · ${withLocation.city}` : ""}`;
    }

    map.src = `https://www.google.com/maps?q=${encoded}&output=embed`;
    map.title = `${safeText(withLocation.name)} location`;

    if (link) {
      link.href = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
      link.style.display = "";
    }
  }

  function init() {
    if (!document.body.classList.contains("ui-experiment")) return;

    const client = window.supabase?.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );
    if (!client) return;

    loadHomeSocialProof(client);
    loadHomeMapTeaser(client);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

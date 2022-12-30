const db = require("../db");
const h = require("../handlers");
const { camelCase } = require("../helpers");

const joinListener = async (io, socket, data) => {
  const { player_id, game } = data;
  // TODO: If game doesn't have a deck yet, create one

  console.log(socket.id, "joining ", game);
  socket.join(game);

  socket.emit("id", socket.id);

  const deck = await h.handleDeck(game);

  // Deal in the newly joined player
  const [playerInGame] = await db.getPlayerInGame(player_id, game);
  const playerHand = await db.getHand(playerInGame.id);
  const updatedPlayerHand = await h.handleHand(
    playerHand,
    playerInGame.id,
    false,
    deck
  );
  socket.emit(
    "hand",
    updatedPlayerHand.map((card) => camelCase(card))
  );

  // Tell everyone who is in the game
  const players = await h.handlePlayers(game);
  io.to(game).emit("players", players);
};

module.exports = joinListener;

// NORMAL
[
  {
    cardId: 86,
    playedAt: null,
    imgixPath:
      "Due_North_A_thunderstorm_of_color_over_a_city_pale_colors_cinem_aa2d5878-249c-41d2-80f7-c43eddfb268f.png",
  },
  {
    cardId: 56,
    playedAt: null,
    imgixPath:
      "pickersberry_chinese_batik_phoenix_d3543d2d-a425-4a0e-b88f-79bbfe4776f2.png",
  },
  {
    cardId: 48,
    playedAt: null,
    imgixPath:
      "LQBibcok_photo_of_a_Tiny_cute_and_adorable_baby_yoda_dressed_in_3292caf3-dfdf-4dcd-8b96-9d920895e5de.png",
  },
  {
    cardId: 91,
    playedAt: null,
    imgixPath:
      "drumm_incredibly_powerful_Anime_Girl_created_by_Hideaki_Anno__K_82e74199-e9f4-49cb-ba28-c20378a0ac2f.png",
  },
  {
    cardId: 4,
    playedAt: null,
    imgixPath:
      "Lisawesa_A_child_in_a_white_spacesuitintricate_detailshttpswww._af68f8f1-e2d7-43b1-b601-d481c605fc7a.png",
  },
  {
    cardId: 6,
    playedAt: null,
    imgixPath:
      "Joseph_Is_Great_pixel_art_harbor_by_a_small_town_at_sunset_cada5b57-24db-40f7-92c7-72d7df5a3cdc.png",
  },
];

// NOT NORMAL:
[
  {
    cardId: 26,
    playedAt: null,
    imgixPath:
      "Kerensky_an_incredibly_detailed_anthropomorphic_frog_elegantly__de0adf1c-5933-46e2-9c08-19f424446049.png",
  },
  {
    cardId: 58,
    playedAt: null,
    imgixPath:
      "onceuponatime_autumn_forest_with_winding_path_70-200_lens_photo_95ab3ee2-2cf8-4629-867d-df20e82241f9.png",
  },
  {
    cardId: 12,
    playedAt: null,
    imgixPath:
      "Bluejay_Jesus_has_flame_sacred_heart_painting_by_Michael_Parkes_d17f16e9-b2b9-4656-ba45-683fe296eed9.png",
  },
  {
    cardId: 91,
    playedAt: null,
    imgixPath:
      "drumm_incredibly_powerful_Anime_Girl_created_by_Hideaki_Anno__K_82e74199-e9f4-49cb-ba28-c20378a0ac2f.png",
  },
  {
    cardId: 82,
    playedAt: null,
    imgixPath:
      "Falcon_bedroom_melting_into_the_ocean_dfc6f7fa-52b8-42e7-98d0-32d931f8d005.png",
  },
  {
    id: 52,
    imgixPath:
      "Alamar_house_carved_into_a_massive_tree_detailed_old_house_extr_8cff81ba-bb8b-4fba-9e1c-052828081df5.png",
  },
];

/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  // onboarding_profile table
  db.newQuery(`CREATE TABLE IF NOT EXISTS "onboarding_profile" (
    "id" TEXT PRIMARY KEY DEFAULT ('op_' || lower(hex(randomblob(7)))),
    "user_id" TEXT DEFAULT '' NOT NULL,
    "mbti_type" TEXT DEFAULT '' NOT NULL,
    "disc_type" TEXT DEFAULT '' NOT NULL,
    "hd_type" TEXT DEFAULT '' NOT NULL,
    "hd_authority" TEXT DEFAULT '' NOT NULL,
    "hd_profile" TEXT DEFAULT '' NOT NULL,
    "birth_date" TEXT DEFAULT '' NOT NULL,
    "birth_time" TEXT DEFAULT '' NOT NULL,
    "situation" TEXT DEFAULT '' NOT NULL,
    "revenus_mensuels" NUMERIC DEFAULT 0 NOT NULL,
    "heures_dispo" NUMERIC DEFAULT 0 NOT NULL,
    "competences" TEXT DEFAULT '[]' NOT NULL,
    "reve_pro" TEXT DEFAULT '' NOT NULL,
    "mission" TEXT DEFAULT '' NOT NULL,
    "domaines_prioritaires" TEXT DEFAULT '[]' NOT NULL,
    "p0_invariants" TEXT DEFAULT '[]' NOT NULL,
    "non_vouloir" TEXT DEFAULT '' NOT NULL,
    "completed" BOOLEAN DEFAULT FALSE NOT NULL,
    "created" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
    "updated" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
  )`).execute()

  db.newQuery(`INSERT OR IGNORE INTO _collections (
    id, type, name, system, schema, indexes, listRule, viewRule, createRule, updateRule, deleteRule
  ) VALUES (
    'sternosonboard01', 'base', 'onboarding_profile', 0,
    '[
      {"id":"opf001","name":"user_id","type":"text","required":false,"presentable":false,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf002","name":"mbti_type","type":"text","required":false,"presentable":true,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf003","name":"disc_type","type":"text","required":false,"presentable":false,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf004","name":"hd_type","type":"text","required":false,"presentable":false,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf005","name":"hd_authority","type":"text","required":false,"presentable":false,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf006","name":"hd_profile","type":"text","required":false,"presentable":false,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf007","name":"birth_date","type":"text","required":false,"presentable":false,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf008","name":"birth_time","type":"text","required":false,"presentable":false,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf009","name":"situation","type":"text","required":false,"presentable":false,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf010","name":"revenus_mensuels","type":"number","required":false,"presentable":false,"options":{"min":null,"max":null,"noDecimal":false}},
      {"id":"opf011","name":"heures_dispo","type":"number","required":false,"presentable":false,"options":{"min":null,"max":null,"noDecimal":false}},
      {"id":"opf012","name":"competences","type":"text","required":false,"presentable":false,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf013","name":"reve_pro","type":"text","required":false,"presentable":false,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf014","name":"mission","type":"text","required":false,"presentable":false,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf015","name":"domaines_prioritaires","type":"text","required":false,"presentable":false,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf016","name":"p0_invariants","type":"text","required":false,"presentable":false,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf017","name":"non_vouloir","type":"text","required":false,"presentable":false,"options":{"min":null,"max":null,"pattern":""}},
      {"id":"opf018","name":"completed","type":"bool","required":false,"presentable":false,"options":{}}
    ]',
    '[]',
    '',
    '',
    '',
    '',
    null
  )`).execute()

}, (db) => {
  db.newQuery(`DROP TABLE IF EXISTS "onboarding_profile"`).execute()
  db.newQuery(`DELETE FROM _collections WHERE id = 'sternosonboard01'`).execute()
})

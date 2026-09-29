'use strict';

/**
 * BASELINE migration.
 *
 * Builds the full schema from the Sequelize models exactly once (tracked in
 * SequelizeMeta, never re-runs). On the existing live database this is a
 * no-op (CREATE TABLE IF NOT EXISTS). On a fresh database it creates every
 * table, index and FK defined by src/models.
 *
 * Every schema change AFTER this point must be its own explicit migration
 * file (queryInterface.addColumn / createTable / ...). Nothing else in the
 * codebase is allowed to change the schema — no sync(), no ad-hoc patches.
 */
module.exports = {
  async up() {
    // eslint-disable-next-line global-require
    const db = require('../src/models');
    await db.sequelize.sync({ alter: false });
  },

  async down() {
    // Baseline cannot be rolled back (it is the entire schema).
  },
};

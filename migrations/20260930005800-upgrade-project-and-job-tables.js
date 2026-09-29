'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const safeAddColumn = async (table, col, def) => {
      try {
        await queryInterface.addColumn(table, col, def);
      } catch {
        // column may already exist
      }
    };

    // 1. Upgrade Projects table
    await safeAddColumn('projects', 'running_project', { type: Sequelize.BOOLEAN, defaultValue: true });
    await safeAddColumn('projects', 'proposal_no', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'project_no', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'project_type', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'service', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'project_name_ar', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'job_site', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'auto_generate_job_no', { type: Sequelize.BOOLEAN, defaultValue: true });
    await safeAddColumn('projects', 'contract_amount', { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 });
    await safeAddColumn('projects', 'reference', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'budget_overrun', { type: Sequelize.STRING, defaultValue: 'Disallow' });
    await safeAddColumn('projects', 'not_to_exceed', { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 });
    await safeAddColumn('projects', 'extension_no', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'parent_project_id', { type: Sequelize.UUID, allowNull: true });
    await safeAddColumn('projects', 'description_ar', { type: Sequelize.TEXT, allowNull: true });
    await safeAddColumn('projects', 'manager_name', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'engineer_name', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'consultant_name', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'consultant_name_ar', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'remark', { type: Sequelize.TEXT, allowNull: true });
    await safeAddColumn('projects', 'customer_address', { type: Sequelize.TEXT, allowNull: true });
    await safeAddColumn('projects', 'customer_address_ar', { type: Sequelize.TEXT, allowNull: true });
    await safeAddColumn('projects', 'contacts_data', { type: Sequelize.JSON, allowNull: true });

    // GL Accounts & Compliance Toggles
    await safeAddColumn('projects', 'revenue_account', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'equipment_expense_account', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'labour_expense_account', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'advance_invoice_account', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'hired_equipment_account', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('projects', 'subcontractor_expense_account', { type: Sequelize.STRING, allowNull: true });

    await safeAddColumn('projects', 'progressive_invoice', { type: Sequelize.BOOLEAN, defaultValue: true });
    await safeAddColumn('projects', 'retention_required', { type: Sequelize.BOOLEAN, defaultValue: false });
    await safeAddColumn('projects', 'short_term_retention_required', { type: Sequelize.BOOLEAN, defaultValue: false });
    await safeAddColumn('projects', 'performance_bond', { type: Sequelize.BOOLEAN, defaultValue: false });
    await safeAddColumn('projects', 'retention_after_vat', { type: Sequelize.BOOLEAN, defaultValue: false });
    await safeAddColumn('projects', 'performance_bond_after_vat', { type: Sequelize.BOOLEAN, defaultValue: false });
    await safeAddColumn('projects', 'not_to_exceed_rule', { type: Sequelize.BOOLEAN, defaultValue: false });
    await safeAddColumn('projects', 'project_activation', { type: Sequelize.BOOLEAN, defaultValue: true });

    // 2. Upgrade Jobs table
    await safeAddColumn('jobs', 'job_category', { type: Sequelize.STRING, allowNull: true });
    await safeAddColumn('jobs', 'uom', { type: Sequelize.STRING, defaultValue: 'NOS' });
    await safeAddColumn('jobs', 'scope_qty', { type: Sequelize.DECIMAL(18, 4), defaultValue: 0 });
    await safeAddColumn('jobs', 'achieved_qty', { type: Sequelize.DECIMAL(18, 4), defaultValue: 0 });
    await safeAddColumn('jobs', 'unit_price', { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 });
    await safeAddColumn('jobs', 'contract_amount', { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 });
    await safeAddColumn('jobs', 'original_budget', { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 });
    await safeAddColumn('jobs', 'co_req_amount', { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 });
    await safeAddColumn('jobs', 'co_amount', { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 });
    await safeAddColumn('jobs', 'revised_total', { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 });
    await safeAddColumn('jobs', 'consumed_cost', { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 });
    await safeAddColumn('jobs', 'pending_amount', { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 });
    await safeAddColumn('jobs', 'invoiced_amount', { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 });
    await safeAddColumn('jobs', 'material_cost_based_on', { type: Sequelize.STRING, defaultValue: 'Current Cost Price' });
    await safeAddColumn('jobs', 'default_discount', { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 });
    await safeAddColumn('jobs', 'breakdown_data', { type: Sequelize.JSON, allowNull: true });
  },

  async down() {
    // Revert logic if needed
  },
};

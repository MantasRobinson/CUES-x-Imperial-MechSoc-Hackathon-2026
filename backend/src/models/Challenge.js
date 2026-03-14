const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Challenge = sequelize.define('Challenge', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('daily', 'weekly', 'community'),
    allowNull: false,
  },
  // e.g. 'sessions_count', 'total_minutes', 'community_minutes'
  criteriaType: {
    type: DataTypes.STRING(60),
    allowNull: false,
    field: 'criteria_type',
  },
  criteriaValue: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'criteria_value',
  },
  xpReward: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'xp_reward',
  },
  startsAt: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'starts_at',
  },
  endsAt: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'ends_at',
  },
  // For community challenges only
  communityGoal: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'community_goal',
  },
  communityProgress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'community_progress',
  },
}, {
  tableName: 'challenges',
  timestamps: false,
});

module.exports = Challenge;

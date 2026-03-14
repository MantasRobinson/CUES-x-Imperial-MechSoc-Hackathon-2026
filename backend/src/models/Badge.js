const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Badge = sequelize.define('Badge', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  // Matches one of BADGE_CRITERIA keys in constants.js
  criteriaType: {
    type: DataTypes.STRING(60),
    allowNull: false,
    field: 'criteria_type',
  },
  // Numeric threshold for the criterion (0 for boolean criteria like first_session)
  criteriaValue: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    field: 'criteria_value',
  },
  rarity: {
    type: DataTypes.ENUM('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'),
    allowNull: false,
    defaultValue: 'Common',
  },
  iconEmoji: {
    type: DataTypes.STRING(10),
    defaultValue: '🏅',
    field: 'icon_emoji',
  },
}, {
  tableName: 'badges',
  timestamps: false,
});

module.exports = Badge;

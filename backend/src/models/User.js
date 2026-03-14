const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'password_hash',
  },
  displayName: {
    type: DataTypes.STRING(80),
    allowNull: false,
    field: 'display_name',
  },
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'avatar_url',
  },
  totalXp: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_xp',
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  currentStreak: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'current_streak',
  },
  longestStreak: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'longest_streak',
  },
  streakFreezes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'streak_freezes',
  },
  // ISO date string (YYYY-MM-DD) of last day a qualifying session was completed
  lastSessionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'last_session_date',
  },
  totalPhoneFreeMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_phone_free_minutes',
  },
  showOnLeaderboard: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'show_on_leaderboard',
  },
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
});

module.exports = User;

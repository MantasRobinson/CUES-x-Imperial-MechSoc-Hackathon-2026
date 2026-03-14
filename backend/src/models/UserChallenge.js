const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserChallenge = sequelize.define('UserChallenge', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  challengeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'challenge_id',
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at',
  },
}, {
  tableName: 'user_challenges',
  timestamps: false,
  indexes: [{ unique: true, fields: ['user_id', 'challenge_id'] }],
});

module.exports = UserChallenge;

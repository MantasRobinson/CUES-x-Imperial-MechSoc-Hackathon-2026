const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_time',
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'end_time',
  },
  durationMinutes: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'duration_minutes',
  },
  disturbanceCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'disturbance_count',
  },
  noiseLevel: {
    type: DataTypes.ENUM('Quiet', 'Moderate', 'Loud'),
    allowNull: false,
    defaultValue: 'Moderate',
    field: 'noise_level',
  },
  xpEarned: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'xp_earned',
  },
  multiplier: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0,
  },
}, {
  tableName: 'sessions',
  timestamps: true,
  updatedAt: false,
  underscored: true,
});

module.exports = Session;

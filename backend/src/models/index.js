const sequelize = require('../config/database');
const User         = require('./User');
const Session      = require('./Session');
const Badge        = require('./Badge');
const UserBadge    = require('./UserBadge');
const Challenge    = require('./Challenge');
const UserChallenge = require('./UserChallenge');

// ── Associations ──────────────────────────────────────────────────────────────

// User ↔ Session
User.hasMany(Session,    { foreignKey: 'userId', as: 'sessions' });
Session.belongsTo(User,  { foreignKey: 'userId', as: 'user' });

// User ↔ Badge  (through UserBadge)
User.belongsToMany(Badge, { through: UserBadge, foreignKey: 'userId',  as: 'badges' });
Badge.belongsToMany(User, { through: UserBadge, foreignKey: 'badgeId', as: 'users' });
UserBadge.belongsTo(Badge, { foreignKey: 'badgeId', as: 'badge' });
UserBadge.belongsTo(User,  { foreignKey: 'userId',  as: 'user' });

// User ↔ Challenge (through UserChallenge)
User.belongsToMany(Challenge,     { through: UserChallenge, foreignKey: 'userId',      as: 'challenges' });
Challenge.belongsToMany(User,     { through: UserChallenge, foreignKey: 'challengeId', as: 'participants' });
UserChallenge.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });
UserChallenge.belongsTo(User,      { foreignKey: 'userId',      as: 'user' });

module.exports = { sequelize, User, Session, Badge, UserBadge, Challenge, UserChallenge };

const Sequelize = require('sequelize')
const sequelize = new Sequelize('movie', 'root', 'onito', {
    host: 'localhost',
    port:3306,
    dialect: 'mysql'
  });
  
  
  const Movie = sequelize.define('movie', {
    tconst: {
      type: Sequelize.STRING(100),
      primaryKey: true
    },
    primaryTitle: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    runtimeMinutes: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    genres: {
      type: Sequelize.STRING(255),
      allowNull: false
    }
  });
  
 
  const Rating = sequelize.define('rating', {
    tconst: {
      type: Sequelize.STRING(100),
      primaryKey: true
    },
    averageRating: {
      type: Sequelize.FLOAT(3, 1),
      allowNull: false
    },
    numVotes: {
      type: Sequelize.INTEGER,
      allowNull: false
    }
  });

Movie.hasMany(Rating, { foreignKey: 'tconst' });
Rating.belongsTo(Movie, { foreignKey: 'tconst' });

  module.exports = {Movie,Rating,sequelize}
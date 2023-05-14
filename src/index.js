// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const csv = require('fast-csv');
const fs = require('fs');
const {Movie,Rating,sequelize}=require("./db.config")

// Set up Express app
const app = express();
app.use(bodyParser.json());

// Create a Sequelize instance



// Create database tables and import data from CSV files
sequelize.sync({ force: true }).then(() => {
  console.log('Database tables created.');

  // Import data from `movies.csv` into the `movies` table
  const moviesReadStream = fs.createReadStream('data/movies.csv');
  const moviesData = [];
  csv.parseStream(moviesReadStream, { headers: true })
    .on('data', (row) => {
      moviesData.push({
        tconst: row.tconst,
        primaryTitle: row.primaryTitle,
        runtimeMinutes: parseInt(row.runtimeMinutes),
        genres: row.genres
      });
    })
    .on('end', () => {
      Movie.bulkCreate(moviesData).then(() => {
        console.log('Imported data from `movies.csv` into the `movies` table.');

        // Import data from `ratings.csv` into the `ratings` table
        const ratingsReadStream = fs.createReadStream('data/ratings.csv');
        const ratingsData = [];
        csv.parseStream(ratingsReadStream, { headers: true })
          .on('data', (row) => {
            ratingsData.push({
              tconst: row.tconst,
              averageRating: parseFloat(row.averageRating),
              numVotes: parseInt(row.numVotes)
            });
          })
          .on('end', () => {
            Rating.bulkCreate(ratingsData).then(() => {
              console.log('Imported data from `ratings.csv` into the `ratings` table.');
            });
          });
      });
    });
});

// Define API routes
app.get('/api/v1/longest-duration-movies', (req, res) => {
  Movie.findAll({
    order: [['runtimeMinutes', 'DESC']],  
    limit: 10
  }).then((movies) => {
    res.json(movies);
  });
});

app.post('/api/v1/new-movie', (req, res) => {
  const { tconst, primaryTitle, runtimeMinutes, genres } = req.body;
  Movie.create({ tconst, primaryTitle, runtimeMinutes, genres }).then(() => {
    res.send('success');
  });
});

app.get('/api/v1/top-rated-movies', async (req, res) => {
  try {
    const movies = await Movie.findAll({
      attributes: ['tconst', 'primaryTitle', 'genres'],
      include: [{
        model: Rating,
        attributes: [[Sequelize.fn('AVG', Sequelize.col('averageRating')), 'averageRating']],
        where: { averageRating: { [Sequelize.Op.gt]: 6.0 } },
        required: true
      }],
      group: ['Movie.tconst'],
      order: [[Sequelize.literal('`rating.averageRating`'), 'DESC']]
    });
    
    res.json(movies);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


app.get('/api/v1/genre-movies-with-subtotals', (req, res) => {
 try {
  sequelize.query(`
    SELECT genres, primaryTitle, SUM(numVotes) AS numVotes
    FROM movies
    JOIN ratings ON movies.tconst = ratings.tconst
    GROUP BY genres, primaryTitle
    WITH ROLLUP
  `).then((result) => {
    res.json(result[0]);
  });}catch(err){
    console.log(err.message)
    res.status(500).json({ message: 'Server error' });
  }
});

// Define SQL queries for updating runtimeMinutes based on genre
const documentaryUpdateQuery = `
  UPDATE movies
  SET runtimeMinutes = runtimeMinutes + 15
  WHERE genres LIKE '%Documentary%'
`;

const animationUpdateQuery = `
  UPDATE movies
  SET runtimeMinutes = runtimeMinutes + 30
  WHERE genres LIKE '%Animation%'
`;

const defaultUpdateQuery = `
  UPDATE movies
  SET runtimeMinutes = runtimeMinutes + 45
  WHERE genres NOT LIKE '%Documentary%' AND genres NOT LIKE '%Animation%'
`;

app.post('/api/v1/update-runtime-minutes', (req, res) => {
  sequelize.query(documentaryUpdateQuery)
    .then(() => sequelize.query(animationUpdateQuery))
    .then(() => sequelize.query(defaultUpdateQuery))
    .then(() => {
      res.send('success');
    });
});

// Start the HTTP server
app.listen(3000, () => {
  console.log('HTTP server started on port 3000.');
});

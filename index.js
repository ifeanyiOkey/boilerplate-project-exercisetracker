const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// mount bodyParser middleware to Parse POST Requests
app.use(bodyParser.urlencoded({ extended: false }));

// create exercise schema
const exerciseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
});

// create user schema
const userSchema = mongoose.Schema({
  username: { type: String, required: true },
  count: { type: Number, default: 0 },
  log: [exerciseSchema],
});

// Let nanoid issue ids through userSchema
userSchema.plugin(require("mongoose-nanoid"), { length: 15 }); // default size = 12
const ExeModel = mongoose.model("ExeModel", exerciseSchema);
const UserModel = mongoose.model("UserModel", userSchema);

// create users api if user does not exist
app.post("/api/users", (req, res) => {
  const postedUser = req.body.username;
  console.log(postedUser);
  UserModel.findOne({ username: postedUser }).then((exist) => {
    if (exist) {
      res.send("Username is already taken! Enter another username.");
    } else {
      // create new user
      newUser = new UserModel({ username: postedUser });
      newUser
        .save()
        .then(() => {
          res.json({ username: newUser.username, _id: newUser._id });
        })
        .catch((err) => {
          console.log(err);
        });
    }
  });
});

// get list of all users
app.get("/api/users", (req, res) => {
  UserModel.find({})
    .then((lists) => {
      res.send(lists);
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/api/users/:_id/exercises", (req, res) => {
  const userId = req.params._id;
  // declearing all req.body variables at once
  const { description, duration, date } = req.body;

  // create new exercise
  let newExercise = new ExeModel({
    description,
    duration,
    date: date ? new Date(date) : new Date(),
  });

  const foundUser = UserModel.findByIdAndUpdate(
    userId,
    { $push: { log: newExercise } },
    { new: true }
  );

  foundUser
    .then((result) => {
      res.json({
        username: result.username,
        description: newExercise.description,
        duration: newExercise.duration,
        date: new Date(newExercise.date).toDateString(),
        _id: result._id,
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

// get user logs
app.get("/api/users/:_id/logs", (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;
  // console.log(limit);
  UserModel.findById(userId)
    .then((result) => {
      if (!result) {
        res.send("Could not find user with this id");
      } else {
        let resultObj = result;

        if (from || to) {
          let fromDate = new Date(0);
          let toDate = new Date();

          if (from) {
            fromDate = new Date(from);
          }
          if (to) {
            toDate = new Date(to);
          }

          fromDate = fromDate.getTime(); // to convert to Unix timestamp
          toDate = toDate.getTime();

          resultObj.log = resultObj.log.filter((exerRecord) => {
            let exerRecDate = new Date(exerRecord.date).getTime();

            return exerRecDate >= fromDate && exerRecDate <= toDate;
          });
        }

        // console.log(resultObj.log);

        // let dateObj = {};
        // if (from) {
        //   dateObj["$gte"] = new date(from);
        // }
        // if (to) {
        //   dateObj["$lte"] = new Date(to);
        // }
        // if (from || to) {
        //   dateObj = resultObj.log.filter((s) => {
        //     s.date;
        //   });
        // }
        if (limit) {
          resultObj.log = result.log.slice(0, limit);
        }

        resultObj["count"] = result.log.length;

        res.json({
          username: resultObj.username,
          count: resultObj.log.length,
          _id: resultObj._id,
          log: resultObj.log.map((d) => ({
            description: d.description,
            duration: d.duration,
            date: new Date(d.date).toDateString(),
          })),
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

// connect mongodb
mongoose
  .connect(process.env["MONGO_URI"])
  .then(() => {
    console.log("database connected");
  })
  .catch((err) => {
    console.log(err);
  });

mongoose.connection.on("open", () => {
  // Wait for mongodb connection before server starts
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
});

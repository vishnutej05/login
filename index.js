const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const cors = require("cors");
const CryptoJS = require("crypto-js");

const app = express();
const port = 3000;
require("dotenv").config();

const secretKey = "password secret key";
const jwtSecretKey = "login secret key";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
});
const User = mongoose.model("users", userSchema);

const schema = new mongoose.Schema({
  full_name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: { type: Number, required: true, unique: true },
  Address: { type: String, required: true },
  lc_handle: { type: String, required: true, unique: true },
  cc_handle: { type: String, required: true, unique: true },
  cf_handle: { type: String, required: true, unique: true },
  hr_handle: { type: String, required: true, unique: true },
  sp_handle: { type: String, required: true, unique: true },
});
const dashboard = mongoose.model("dashboard", schema);

// Connect to MongoDB database named "DocType"
mongoose
  .connect(
    "mongodb+srv://vishnutej345:3CJkhCrfsbTGwbXW@cluster0.cbdtlhz.mongodb.net/DocType",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Connected to MongoDB database");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  });

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Define nodemailer function to send recovery email
function sendEmail(userData) {
  const { recipient_email, OTP } = userData;
  return new Promise((resolve, reject) => {
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MY_EMAIL,
        pass: process.env.MY_PASSWORD,
      },
    });

    const mail_configs = {
      from: process.env.MY_EMAIL,
      to: recipient_email,
      subject: "PASSWORD RECOVERY",
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DocType - OTP Email Template</title>
</head>
<body>
<!-- partial:index.partial.html -->
<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
  <div style="margin:50px auto;width:70%;padding:20px 0">
    <div style="border-bottom:1px solid #eee">
      <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Reset Your Password</a>
    </div>
    <p style="font-size:1.1em">Hi,</p>
    <p>Thank you for choosing DocType. Use the following OTP to complete your Password Recovery Procedure. OTP is valid for 5 minutes:</p>
    <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;"><b>${OTP}</b></h2>
    <p style="font-size:1em;">Regards,<br>DocType</p>
  </div>
</div>
<!-- partial -->
  
</body>
</html>`,
    };

    transporter.sendMail(mail_configs, function (error) {
      if (error) {
        console.log(error);
        return reject({ message: `Error sending email` });
      }
      return resolve({ message: "Email sent successfully" });
    });
  });
}

// Define authentication middleware
const authenticate = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];

  if (authHeader != undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken === undefined) {
    response.status(401).send("Invalid Access Token");
  } else {
    jwt.verify(jwtToken, jwtSecretKey, async (error, payload) => {
      if (error) {
        response.status(401).send("Invalid Access Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

// GET / - Get all users
app.get("/", async (request, response) => {
  response.send("Welcomer to the server");
});

// POST /login - User login
app.post("/hashlogin", async (request, response) => {
  const { username, password } = request.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      response.status(400).send("User does't exists");
      return;
    }

    const decryptedPassword = CryptoJS.AES.decrypt(
      user.password,
      secretKey
    ).toString(CryptoJS.enc.Utf8);

    // Log decrypted password and input password for debugging
    console.log("Decrypted Password:", decryptedPassword);
    console.log("Input Password:", password);

    const isPasswordMatched = password == decryptedPassword;

    if (isPasswordMatched) {
      const payload = { username };
      const jwtToken = jwt.sign(payload, jwtSecretKey);
      response.send({ jwtToken });
    } else {
      response.status(400).send("Invalid Password");
    }
  } catch (error) {
    console.error("Error:", error);
    response.status(500).send("Internal Server Error");
  }
});

app.post("/register", async (req, response) => {
  const { username, password, email } = req.body;

  console.log(email);

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      response.status(400).send("User Already Exists !");
      return;
    }

    // const hashedPass = await bcrypt.hash(password, 10);

    const EncryptedPass = CryptoJS.AES.encrypt(password, secretKey).toString();
    const newUser = new User({
      username,
      password: EncryptedPass,
      email: email,
    });
    await newUser.save();

    response.send("User Created Successfully");
  } catch (error) {
    console.error("Error:", error);
    response.status(500).send("Internal Server Error");
  }
});

// GET /profile - Retrieve user profile
app.get("/profile", authenticate, async (request, response) => {
  try {
    const { username } = request;
    const user = await User.findOne({ username });
    if (!user) {
      response.status(404).send("User Not Found");
      return;
    }
    response.send(user);
  } catch (error) {
    console.error("Error:", error);
    response.status(500).send("Internal Server Error");
  }
});

app.post("/send_recovery_email", (req, res) => {
  const { recipient_email, OTP, username } = req.body;
  sendEmail({ recipient_email, OTP, username })
    .then((response) => res.send(response.message))
    .catch((error) => res.status(500).send(error.message));
});

//the next thing is to check if the email given is present in the database and return his creds

app.post("/givecreds", async (req, res) => {
  try {
    const { email } = req.body;
    console.log(email);
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send("User Not Found");
    }

    const decryptedPassword = CryptoJS.AES.decrypt(
      user.password,
      secretKey
    ).toString(CryptoJS.enc.Utf8);

    res.send({
      username: user.username,
      password: decryptedPassword,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/addusers", async (req, res) => {
  try {
    const newUser = new dashboard(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/getusers", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

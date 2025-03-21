const express= require('express')
const mongoose= require('mongoose')
const dotenv= require('dotenv')
const cors= require('cors')
const bcrypt= require('bcrypt')
const jwt = require('jsonwebtoken')
const { checkAuth } = require("./middleware/authMiddleware");
const User = require("./models/User");
const Post = require("./models/Post");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

// User authentication routes
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
    // console.log("login request recieved")
  try {
    const { email, password } = req.body;
    // console.log(req.body)
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// CRUD operations for posts
app.get("/api/posts", async (req, res) => {
  const posts = await Post.find();
  res.json(posts);
});

app.post("/api/posts", checkAuth, async (req, res) => {
  const { title, content } = req.body;
  const newPost = new Post({ title, content, userId: req.userId });
  await newPost.save();
  res.status(201).json(newPost);
});

app.put("/api/posts/:id", checkAuth, async (req, res) => {
  const { title, content } = req.body;
  const updatedPost = await Post.findByIdAndUpdate(req.params.id, { title, content }, { new: true });
  res.json(updatedPost);
});

app.delete("/api/posts/:id", checkAuth, async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.json({ message: "Post deleted" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
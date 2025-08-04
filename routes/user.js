const express = require('express');
const verifyToken = require('../middleware/verifyToken');
const User = require('../models/User');

const router = express.Router();

router.put('/platforms', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { leetcode, codeforces, github, gfg, codechef, hackerrank } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'platforms.leetcode': leetcode,
          'platforms.codeforces': codeforces,
          'platforms.github': github,
          'platforms.gfg': gfg,
          'platforms.codechef': codechef,
          'platforms.hackerrank': hackerrank,
        },
      },
      { new: true }
    );

    res.status(200).json({ message: "Platforms updated", platforms: updatedUser.platforms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});


module.exports = router;

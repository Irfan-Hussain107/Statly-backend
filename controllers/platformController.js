const User = require('../models/User');
const axios = require('axios');
const cheerio = require('cheerio');

const generateVerificationCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const getGitHubStars = async (username) => {
    try {
        const response = await axios.get(`https://api.github.com/users/${username}/repos`);
        return response.data.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    } catch (error) {
        console.error('Error fetching GitHub repos for stars:', error.message);
        return 0;
    }
};

const dataFetchers = {
    codeforces: async (username) => {
        const userResponse = await axios.get(`https://codeforces.com/api/user.info?handles=${username}`);
        const statusResponse = await axios.get(`https://codeforces.com/api/user.status?handle=${username}&from=1&count=5000`);
        const contestResponse = await axios.get(`https://codeforces.com/api/user.rating?handle=${username}`);

        const userInfo = userResponse.data.result[0];
        const submissions = statusResponse.data.result;
        const contests = contestResponse.data.result.length;
        
        const solvedProblems = new Set();
        if (submissions && submissions.length > 0) {
            submissions.forEach(sub => {
                if (sub.verdict === 'OK') {
                    const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
                    solvedProblems.add(problemId);
                }
            });
        }

        return {
            rating: userInfo.rating || 0,
            maxRating: userInfo.maxRating || 0,
            rank: userInfo.rank || 'Unrated',
            problemsSolved: solvedProblems.size,
            contests: contests || 0,
        };
    },
    github: async (username) => {
        const userResponse = await axios.get(`https://api.github.com/users/${username}`);
        const userInfo = userResponse.data;
        const totalStars = await getGitHubStars(username);
        return {
            public_repos: userInfo.public_repos || 0,
            followers: userInfo.followers || 0,
            total_stars: totalStars,
        };
    },
    leetcode: async (username) => {
        const response = await axios.post('https://leetcode.com/graphql', {
            query: `
                query getUserProfile($username: String!) {
                    allQuestionsCount { difficulty count }
                    matchedUser(username: $username) {
                        username
                        submitStats: submitStatsGlobal {
                            acSubmissionNum { difficulty count submissions }
                        }
                    }
                    userContestRanking(username: $username) {
                        attendedContestsCount
                        rating
                    }
                }
            `,
            variables: { username }
        });
        const stats = response.data.data.matchedUser.submitStats.acSubmissionNum;
        const contestData = response.data.data.userContestRanking;
        const easy = stats.find(s => s.difficulty === 'Easy').count;
        const medium = stats.find(s => s.difficulty === 'Medium').count;
        const hard = stats.find(s => s.difficulty === 'Hard').count;
        return {
            problemsSolved: easy + medium + hard,
            easy,
            medium,
            hard,
            contests: contestData?.attendedContestsCount || 0,
            rating: Math.round(contestData?.rating || 0),
        };
    },
    codechef: async (username) => {
        try {
            const response = await axios.get(`https://www.codechef.com/users/${username}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            const $ = cheerio.load(response.data);
            const rating = parseInt($('.rating-number').text().replace(/\D/g, '')) || 0;
            
            // Extract problems solved
            let problemsSolved = 0;
            const pageText = $.text();
            const problemPatterns = [
                /solved[:\s]*(\d+)/i,
                /(\d+)\s*problems?\s*solved/i,
                /(\d+)\s*solved/i
            ];
            
            for (const pattern of problemPatterns) {
                const match = pageText.match(pattern);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > 0 && num < 10000) {
                        problemsSolved = num;
                        break;
                    }
                }
            }
            
            let contests = 0;
            const contestMatch = pageText.match(/(\d+)\s*contests?\s*(attended|participated)/i);
            if (contestMatch) {
                contests = parseInt(contestMatch[1]);
            }
            
            return { rating, problemsSolved, contests };
        } catch (error) {
            console.error('CodeChef scraping error:', error.message);
            throw error;
        }
    },
    geeksforgeeks: async (username) => {
        const response = await axios.get(`https://auth.geeksforgeeks.org/user/${username}/practice`);
        const $ = cheerio.load(response.data);
        const problemsSolved = parseInt($($('.tabs.tabs-fixed-width.links a')[0]).text().match(/\d+/)[0]) || 0;
        return { problemsSolved };
    },
};

const verifiers = {
    codeforces: async (username, code) => {
        const response = await axios.get(`https://codeforces.com/api/user.info?handles=${username}`);
        const userInfo = response.data.result[0];
        const bio = `${userInfo.firstName || ''} ${userInfo.lastName || ''} ${userInfo.organization || ''}`;
        return bio.includes(code);
    },
    github: async (username, code) => {
        const response = await axios.get(`https://api.github.com/users/${username}`);
        const bio = response.data.bio || '';
        return bio.includes(code);
    },
    leetcode: async (username, code) => {
        const response = await axios.post('https://leetcode.com/graphql', {
            query: `query userPublicProfile($username: String!) {
                matchedUser(username: $username) {
                    profile {
                        aboutMe
                    }
                }
            }`,
            variables: { username }
        });
        const bio = response.data.data.matchedUser.profile.aboutMe || '';
        return bio.includes(code);
    },
    codechef: async (username, code) => {
        const response = await axios.get(`https://www.codechef.com/users/${username}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        
        const nameSelectors = ['.user-details-container h1', '.user-details h1', 'h1'];
        for (const selector of nameSelectors) {
            const name = $(selector).text().trim();
            if (name && name.includes(code)) {
                return true;
            }
        }
        return false;
    },
    geeksforgeeks: async (username, code) => {
        const response = await axios.get(`https://auth.geeksforgeeks.org/user/${username}/practice`);
        const $ = cheerio.load(response.data);
        const displayName = $('.profile_name').text();
        return displayName.includes(code);
    },
};

exports.startVerification = async (req, res) => {
    const { platform, username } = req.body;
    const userId = req.user.id;

    if (!verifiers[platform]) {
        return res.status(400).json({ message: 'Unsupported platform.' });
    }

    try {
        const verificationCode = generateVerificationCode();
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        
        if (!user.platforms) {
            user.platforms = new Map();
        }
        
        user.platforms.set(platform, {
            username,
            verificationCode,
            verified: false,
            data: {}
        });
        
        user.markModified('platforms');
        await user.save();

        res.json({ verificationCode });
    } catch (error) {
        console.error("Start Verification Error:", error);
        res.status(500).json({ message: 'Server error while starting verification.' });
    }
};

exports.verifyPlatform = async (req, res) => {
    const { platform } = req.body;
    const userId = req.user.id;

    try {
        const user = await User.findById(userId);
        const platformInfo = user.platforms.get(platform);

        if (!platformInfo || !platformInfo.verificationCode) {
            return res.status(400).json({ message: 'Verification not started for this platform.' });
        }

        const { username, verificationCode } = platformInfo;
        const isVerified = await verifiers[platform](username, verificationCode);

        if (!isVerified) {
            return res.status(400).json({ message: 'Verification failed. Code not found in your profile. Please try again.' });
        }

        const platformData = await dataFetchers[platform](username);
        
        user.platforms.set(platform, {
            username,
            verified: true,
            verificationCode: null,
            data: { ...platformData, lastFetched: new Date() },
        });
        
        user.markModified('platforms');
        await user.save();
        
        res.json({
            message: 'Platform verified successfully!',
            platforms: user.platforms
        });

    } catch (error) {
        console.error("Complete Verification Error:", error.message);
        res.status(500).json({ message: `Error verifying ${platform}. The username might be incorrect or the platform's API is down.` });
    }
};

exports.getConnectedPlatforms = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('platforms');
        res.json({ platforms: user.platforms || {} });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.refreshPlatformData = async (req, res) => {
    const { platform } = req.params;
    const userId = req.user.id;
    
    try {
        const user = await User.findById(userId);
        const platformInfo = user.platforms.get(platform);

        if (!platformInfo || !platformInfo.verified) {
            return res.status(400).json({ message: 'Platform not verified.' });
        }

        const newData = await dataFetchers[platform](platformInfo.username);
        platformInfo.data = { ...newData, lastFetched: new Date() };
        
        user.markModified('platforms');
        await user.save();
        
        res.json({ message: 'Data refreshed!', platforms: user.platforms });
    } catch (error) {
        console.error("Refresh Error:", error);
        res.status(500).json({ message: 'Error refreshing data.' });
    }
};

exports.disconnectPlatform = async (req, res) => {
    const { platform } = req.params;
    const userId = req.user.id;

    try {
        const user = await User.findById(userId);
        if (user.platforms) {
            user.platforms.delete(platform);
            user.markModified('platforms');
            await user.save();
        }
        
        res.json({ message: 'Platform disconnected.', platforms: user.platforms });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};
res.status(500).json({ error: 'Failed to fetch MP3 after 3 retries' });
        }
      });
    }
    return res.status(500).json({ error: 'Failed to fetch MP3 after 3 retries' });
  }
});

// Start the server

app.listen(port, () => {
  console.log('Express server initialized');
});

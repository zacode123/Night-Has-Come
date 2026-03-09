-- database/schema.sql

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(10) UNIQUE NOT NULL,
  host_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  phase VARCHAR(20) DEFAULT 'Lobby',
  day_number INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL,
  age INTEGER,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  role VARCHAR(20),
  alive BOOLEAN DEFAULT TRUE,
  connected BOOLEAN DEFAULT TRUE,
  personality VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES players(id) ON DELETE CASCADE,
  target_id UUID REFERENCES players(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE kills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  mafia_id UUID REFERENCES players(id) ON DELETE CASCADE,
  target_id UUID REFERENCES players(id) ON DELETE CASCADE,
  night INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE abilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  ability_type VARCHAR(50) NOT NULL,
  target_id UUID REFERENCES players(id) ON DELETE CASCADE,
  night INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES players(id) ON DELETE CASCADE,
  sender_name VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kills ENABLE ROW LEVEL SECURITY;
ALTER TABLE abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

-- Policies

-- Rooms: Anyone can read, only host can update (conceptually, but we'll use service role for logic)
CREATE POLICY "Public rooms are viewable by everyone" ON rooms
  FOR SELECT USING (true);

-- Players: Anyone can read (to see who is in the lobby)
CREATE POLICY "Players are viewable by everyone" ON players
  FOR SELECT USING (true);

-- Messages: Viewable by everyone in the room (for simplicity, or restrict to room_id)
CREATE POLICY "Messages are viewable by everyone in the room" ON messages
  FOR SELECT USING (true);

-- Votes: Viewable by everyone (public voting)
CREATE POLICY "Votes are viewable by everyone" ON votes
  FOR SELECT USING (true);

-- Kills: Only viewable by Mafia (this is tricky with simple RLS, usually handled by server or separate subscription)
-- For now, we'll restrict it to service role or specific logic. 
-- Actually, kills result is public after morning, but the action itself is private.
-- We might want to keep kills private and only expose the result via 'players' table updates or 'messages'.
-- So maybe no public select policy for kills?
-- Let's allow service role full access (default) and restrict public.

-- Abilities: Private to the player
CREATE POLICY "Abilities are viewable by the player" ON abilities
  FOR SELECT USING (auth.uid() = player_id);

-- Episodes: Public read
CREATE POLICY "Episodes are viewable by everyone" ON episodes
  FOR SELECT USING (true);

-- Note: Most write operations are handled via API routes using Service Role, 
-- so we don't necessarily need INSERT/UPDATE policies for public users 
-- unless we allow direct client-side writes.
-- For chat, we might allow direct insert if we want, but API route is safer for rate limiting.

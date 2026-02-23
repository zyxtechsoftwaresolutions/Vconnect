-- Group calls (video/audio) for Groups - Google Meet–style integration
-- Run this in Supabase SQL Editor after your main schema.

-- Table: group_calls
CREATE TABLE IF NOT EXISTS group_calls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Group Call',
    call_type VARCHAR(20) NOT NULL DEFAULT 'video' CHECK (call_type IN ('video', 'audio')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'scheduled', 'ended')),
    meeting_url TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_calls_group_id ON group_calls(group_id);
CREATE INDEX IF NOT EXISTS idx_group_calls_status ON group_calls(status);
CREATE INDEX IF NOT EXISTS idx_group_calls_scheduled_at ON group_calls(scheduled_at);

-- Allow CALL message type in messages (for posting meeting links)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
    CHECK (message_type IN ('TEXT', 'FILE', 'IMAGE', 'VIDEO', 'AUDIO', 'ANNOUNCEMENT', 'CALL'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_group_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_group_calls_updated_at ON group_calls;
CREATE TRIGGER update_group_calls_updated_at
    BEFORE UPDATE ON group_calls
    FOR EACH ROW
    EXECUTE PROCEDURE update_group_calls_updated_at();

COMMENT ON TABLE group_calls IS 'Video/audio calls per group; meeting_url can be Jitsi or Google Meet link';

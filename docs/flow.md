# Message Processing Flow

This document explains how Arki processes messages with **native multimodal support**, step by step.

## Basic Flow

1. **User mentions @Arki** in a Discord channel
2. **Permission check** - Is the user allowed to use the bot?
3. **Fetch recent messages** from the channel (for context)
4. **Native multimodal conversion** - Transform Discord messages using OpenAI SDK's native content types
5. **Generate AI response** - Send to OpenRouter/OpenAI API with native multimodal context
6. **Handle tool calls** (if any) - Execute tools like get_date_time
7. **Send response** back to Discord (split if too long)
8. **Store tool calls** in memory for future context

## 🎨 Native Multimodal Conversion

The conversion process now uses OpenAI SDK's native content types for optimal AI processing:

### **Native Content Types**

#### **Images** 🖼️
- **Format**: `{ type: "image_url", image_url: { url: "...", detail: "auto" } }`
- **Benefit**: Direct image processing by vision models
- **No Token Cost**: Images don't consume text tokens
- **Better Understanding**: AI sees actual visual content

#### **Audio** 🎵
- **Format**: `{ type: "input_audio", input_audio: { data: "base64", format: "wav" } }`
- **Support**: Ready for native audio when base64 data available
- **Fallback**: Text descriptions for Discord URLs (for now)

#### **Text** 📝
- **Format**: `{ type: "text", text: "content" }`
- **Rich Context**: Includes usernames, timestamps, metadata
- **Smart Grouping**: Related content grouped together

### **Content Conversion Strategy**

#### **For User Messages:**
1. **Username**: Added as both OpenAI `name` field and text content
2. **Message Reference**: Reply context as text part
3. **Main Content**: Original text as text part
4. **Images**: Native `image_url` parts (not text descriptions!)
5. **Audio**: Text descriptions (native support ready for base64)
6. **Other Attachments**: Descriptive text parts
7. **Discord Features**: Embeds, stickers, polls, reactions as text
8. **Timestamp**: Context information as text

#### **For Bot Messages:**
1. **Text Content**: Simple text or multimodal array
2. **Images**: Native `image_url` parts for bot images too
3. **Other Attachments**: Simplified text descriptions
4. **Tool Integration**: Seamless tool call context from memory

### **Smart Conversion Logic**

```typescript
// Images: Native support
if (contentType.startsWith('image/')) {
  return {
    type: 'image_url',
    image_url: { url: attachment.url, detail: 'auto' }
  };
}

// Audio: Ready for native (fallback to text for now)
if (contentType.startsWith('audio/')) {
  // Future: Convert to base64 for native support
  return { type: 'text', text: '[Audio File: ...]' };
}

// Other files: Descriptive text
return { type: 'text', text: '[Attachment: ...]' };
```

### **OpenAI Format Integration**

#### **Multimodal Message Structure**:
```json
{
  "role": "user",
  "name": "clean_username",
  "content": [
    { "type": "text", "text": "username:" },
    { "type": "text", "text": "Hello! Check this image:" },
    { "type": "image_url", "image_url": { "url": "...", "detail": "auto" } },
    { "type": "text", "text": "[Sent: 2024-01-01 12:00:00]" }
  ]
}
```

#### **Single Text Optimization**:
```json
{
  "role": "assistant",
  "content": "Simple text response"
}
```

## Code Flow

```
index.ts
  ↓ (message event)
message-handler.ts
  ↓ (calls)
processUserMessage()
  ↓ (uses)
message-utils.ts → convertToAIMessages() [NATIVE MULTIMODAL]
  ↓ (creates native image_url/audio parts)
ai-service.ts → generateResponse()
  ↓ (may trigger)
tools/ → execute tool functions
  ↓ (stores in)
tool-calls-store.ts
  ↓ (sends via)
message-utils.ts → sendSplitMessage()
```

## Key Functions

- `handleMessage()` - Main entry point for @mentions
- `processUserMessage()` - Orchestrates the AI interaction  
- `convertToAIMessages()` - **Native multimodal** Discord → OpenAI format conversion
- `convertAttachmentToContentPart()` - **Smart attachment handling** (native vs text)
- `convertEmbedToText()` - Discord embed → text (no native equivalent)
- `generateResponse()` - Calls AI API with **native multimodal context**
- `sendSplitMessage()` - Sends response back to Discord

## Tool Call Flow

When the AI wants to use a tool:

1. AI response includes `tool_calls` array
2. `processToolCalls()` executes each tool function
3. Tool results are sent back to AI for final response
4. Final response sent to Discord
5. Tool calls stored in memory against the bot's message

This allows the AI to remember what tools it used in future conversations while maintaining rich **native multimodal context** from all message types.

## 🚀 Performance Benefits

### **Native Multimodal Advantages:**
- **Better AI Understanding**: Vision models process images directly
- **Token Efficiency**: Images don't count as text tokens
- **Improved Accuracy**: AI sees actual visual content vs descriptions
- **Future-Ready**: Audio/video support ready when available
- **API Compatibility**: Full OpenAI SDK compliance

### **Before vs After:**
```diff
// Before: Everything converted to text
- content: "user123: Check this image: [Image: photo.jpg (2.5MB) - JPEG]"

// After: Native multimodal content
+ content: [
+   { type: "text", text: "user123: Check this image:" },
+   { type: "image_url", image_url: { url: "...", detail: "auto" } }
+ ]
```

This native approach provides significantly better AI understanding and performance! 
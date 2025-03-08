// Modified instagramPost.js to only use characterModel
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const characterModel = require('../database/models/characterModel');
const teamModel = require('../database/models/teamModel');

async function instagramPost(interaction) {
  try {
    const playerName = interaction.options.getString('player');
    const imageUrl = interaction.options.getString('image');
    const image2Url = interaction.options.getString('image2') || null;
    const image3Url = interaction.options.getString('image3') || null;
    const image4Url = interaction.options.getString('image4') || null;
    const caption = interaction.options.getString('caption');
    const hashtags = interaction.options.getString('hashtags');
    const location = interaction.options.getString('location');
    const guildId = interaction.guildId;
    
    // Find character using the character model
    let character;
    try {
      character = await characterModel.getCharacterByName(playerName, guildId);
    } catch (error) {
      console.error("Error finding character:", error);
      return interaction.reply(`Error finding character: ${error.message}`);
    }
    
    if (!character) {
      return interaction.reply(`Character "${playerName}" doesn't exist. Make sure you're using their exact name.`);
    }
    
    // All character types are allowed to create posts
    
    // Check if the user is the one who created the character
    if (character.user_id !== interaction.user.id) {
      return interaction.reply({ 
        content: 'You can only create posts for your own characters.', 
        ephemeral: true 
      });
    }
    
    // Validate main image URL
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return interaction.reply({
        content: 'Please provide a valid image URL that starts with http:// or https://',
        ephemeral: true
      });
    }
    
    // Validate additional images if provided
    const additionalImages = [image2Url, image3Url, image4Url].filter(url => url !== null);
    for (const url of additionalImages) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return interaction.reply({
          content: `Invalid additional image URL: ${url}. All image URLs must start with http:// or https://`,
          ephemeral: true
        });
      }
    }
    
    // Get team info for the character
    const team = await teamModel.getTeamById(character.team_id, guildId);
    
    // Format hashtags if provided
    let formattedHashtags = '';
    if (hashtags) {
      // Remove # if already included and add spaces for readability
      formattedHashtags = hashtags
        .split(/[,\s]+/)
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .join(' ');
    }
    
    // Add some default hockey-related hashtags
    if (!formattedHashtags.includes('#hockey')) {
      formattedHashtags += ' #hockey';
    }
    
    if (team && !formattedHashtags.includes(`#${team.name.replace(/\s+/g, '')}`)) {
      formattedHashtags += ` #${team.name.replace(/\s+/g, '')}`;
    }
    
    if (!formattedHashtags.includes('#hockeylife')) {
      formattedHashtags += ' #hockeylife';
    }
    
    // Generate a random number of likes between 100 and 5000
    const likeCount = Math.floor(Math.random() * 4900) + 100;
    
    // Format location display
    const locationDisplay = location ? `📍 ${location}` : null;

    // No title display needed
    const displayTitle = '';

    // Build the Instagram-style embed
    const embed = new EmbedBuilder()
      .setColor('#E1306C') // Instagram color
      .setAuthor({
        name: `${character.name} (@${character.name.replace(/\s+/g, '_').toLowerCase()})`,
        iconURL: character.image_url || null
      })
      .setImage(imageUrl)
      .setTimestamp();
    
    // Only set title if location is provided
    if (locationDisplay) {
      embed.setTitle(locationDisplay);
    }
    
    // Generate random username for a comment
    const randomCommentUsers = [
      'hockey_fan92', 'ice_queen', 'puck_master', 'slap_shot_king', 
      'stick_handler', 'goal_scorer', 'net_minder', 'captain_awesome',
      'puck_lover', 'hockey_life', 'rink_rat', 'zamboni_driver'
    ];
    
    const randomUser = randomCommentUsers[Math.floor(Math.random() * randomCommentUsers.length)];
    
    // Add caption
    let fullCaption = '';
    if (caption) {
      fullCaption = caption;
    }
    
    // Add hashtags to caption (Instagram style)
    if (formattedHashtags) {
      fullCaption += '\n\n' + formattedHashtags;
    }
    
    // Add indicator for multiple images if applicable
    const hasMultipleImages = additionalImages.length > 0;
    if (hasMultipleImages) {
      fullCaption += `\n\n📸 ${additionalImages.length + 1} images`;
    }
    
    if (fullCaption) {
      embed.setDescription(fullCaption);
    }
    
    // Add Instagram details as fields
    embed.addFields(
      { name: '❤️ Likes', value: `${likeCount.toLocaleString()}`, inline: true },
      { name: '💬 Comments', value: '21', inline: true }
    );
    
    // Add a random comment
    const randomComments = [
      '🔥🔥🔥',
      'Amazing shot!',
      'Looking good! 👍',
      'Great form on the ice!',
      'I need to get back to the rink soon',
      'Hockey season is the best season',
      'This is awesome',
      'Absolute legend!',
      'My favorite player! 🏒'
    ];
    
    
    const randomComment = randomComments[Math.floor(Math.random() * randomComments.length)];
    
    embed.addFields(
      { name: 'Recent Comments', value: `**${randomUser}**: ${randomComment}` }
    );
    
    // Add footer with Instagram-like info and gallery indicator if multiple images
    let footerText = `Instagram • ${new Date().toLocaleDateString()}`;
    if (hasMultipleImages) {
      footerText += ` • 1/${additionalImages.length + 1}`;
    }
    
    embed.setFooter({ 
      text: footerText
    });
    
    // Create interactive buttons with post ID for tracking
    const postId = Date.now().toString(); // Simple timestamp-based ID for the post
    
    // Create base buttons that will be used in all embeds
    const createBaseButtons = () => {
      return new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`like_${postId}`)
            .setLabel('❤️ Like')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`comment_${postId}`)
            .setLabel('💬 Comment')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`share_${postId}`)
            .setLabel('🔄 Share')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`save_${postId}`)
            .setLabel('🔖 Save')
            .setStyle(ButtonStyle.Secondary)
        );
    };
    
    // Add navigation buttons if there are multiple images
    let navButtons = null;
    if (hasMultipleImages) {
      navButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`prev_${postId}`)
            .setLabel('◀️ Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true), // Initially disabled since we're on the first image
          new ButtonBuilder()
            .setCustomId(`next_${postId}`)
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Primary)
        );
    }
    
    // Create an array of all embeds (main image and additional images)
    const allEmbeds = [embed];
    
    // Create embeds for additional images
    additionalImages.forEach((imgUrl, index) => {
      const additionalEmbed = new EmbedBuilder()
        .setColor('#E1306C')
        .setAuthor({
          name: `${character.name} (@${character.name.replace(/\s+/g, '_').toLowerCase()})`,
          iconURL: character.image_url || null
        })
        .setImage(imgUrl)
        .setDescription(fullCaption)
        .addFields(
          { name: '❤️ Likes', value: `${likeCount.toLocaleString()}`, inline: true },
          { name: '💬 Comments', value: '21', inline: true },
          { name: 'Recent Comments', value: `**${randomUser}**: ${randomComment}` }
        )
        .setFooter({ 
          text: `Instagram • ${new Date().toLocaleDateString()} • ${index + 2}/${additionalImages.length + 1}`
        })
        .setTimestamp();
      
      // Only set title if location is provided
      if (locationDisplay) {
        additionalEmbed.setTitle(locationDisplay);
      }
      
      allEmbeds.push(additionalEmbed);
    });
    
    // Send the Instagram post to the channel and create a thread for interactions
    const components = [createBaseButtons()];
    if (navButtons) {
      components.push(navButtons);
    }
    
    const response = await interaction.reply({ 
      content: `${character.name} shared a new Instagram post!`,
      embeds: [allEmbeds[0]],
      components: components
    }).then(interactionResponse => interactionResponse.fetch());
    
    // Create a thread for interactions
    const thread = await response.startThread({
      name: `${character.name}'s Instagram Post`,
      autoArchiveDuration: 1440 // Auto-archive after 1 day
    });
    
    // Set up a collector for button interactions with proper filter
    const collector = response.createMessageComponentCollector({
      filter: i => i.customId.includes(postId),
      time: 259200000 // 3 day timeout
    });
    
    // Keep track of current image index
    let currentImageIndex = 0;
    
    collector.on('collect', async i => {
      try {
        // Get action type and post ID from the button's customId
        const [action, actionPostId] = i.customId.split('_');
        
        // Handle navigation buttons
        if (action === 'next' || action === 'prev') {
          // Update the current image index
          if (action === 'next') {
            currentImageIndex = (currentImageIndex + 1) % allEmbeds.length;
          } else {
            currentImageIndex = (currentImageIndex - 1 + allEmbeds.length) % allEmbeds.length;
          }
    
          // Create fresh button components for each update
          const updatedBaseButtons = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`like_${actionPostId}`)
                .setLabel('❤️ Like')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`comment_${actionPostId}`)
                .setLabel('💬 Comment')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`share_${actionPostId}`)
                .setLabel('🔄 Share')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`save_${actionPostId}`)
                .setLabel('🔖 Save')
                .setStyle(ButtonStyle.Secondary)
            );
    
          // Update navigation buttons
          const updatedNavButtons = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`prev_${actionPostId}`)
                .setLabel('◀️ Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentImageIndex === 0), // Disable if we're on the first image
              new ButtonBuilder()
                .setCustomId(`next_${actionPostId}`)
                .setLabel('Next ▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentImageIndex === allEmbeds.length - 1) // Disable if we're on the last image
            );
          
          // Update the message with the new embed and buttons
          const updatedComponents = [updatedBaseButtons];
          if (hasMultipleImages) {
            updatedComponents.push(updatedNavButtons);
          }
          
          await i.update({ embeds: [allEmbeds[currentImageIndex]], components: updatedComponents });
          return;
        }    
      
        // Handle other button actions
        if (action === 'like') {
          // Show character selection modal
          await i.showModal({
            title: 'Select Your Character',
            customId: `char_select_like_${actionPostId}`,
            components: [
              {
                type: 1, // Action Row
                components: [
                  {
                    type: 4, // Text Input
                    custom_id: 'character_name',
                    label: 'Your Character Name',
                    style: 1, // Short style
                    placeholder: 'Enter your character\'s name',
                    required: true
                  }
                ]
              }
            ]
          });
        } 
        else if (action === 'comment') {
          // Show comment modal with character selection
          await i.showModal({
            title: 'Instagram Comment',
            customId: `char_comment_${actionPostId}`,
            components: [
              {
                type: 1, // Action Row
                components: [
                  {
                    type: 4, // Text Input
                    custom_id: 'character_name',
                    label: 'Your Character Name',
                    style: 1, // Short style
                    placeholder: 'Enter your character\'s name',
                    required: true
                  }
                ]
              },
              {
                type: 1, // Action Row
                components: [
                  {
                    type: 4, // Text Input
                    custom_id: 'reply_to',
                    label: 'Reply to (Optional)',
                    style: 1, // Short style
                    placeholder: 'Enter character name if replying to someone',
                    required: false
                  }
                ]
              },
              {
                type: 1, // Action Row
                components: [
                  {
                    type: 4, // Text Input
                    custom_id: 'comment_text',
                    label: 'Comment',
                    style: 2, // Paragraph style
                    placeholder: 'What does your character want to say?',
                    required: true
                  }
                ]
              }
            ]
          });
        }
        else if (action === 'share') {
          // Show character selection modal for sharing
          await i.showModal({
            title: 'Share Post',
            customId: `char_share_${actionPostId}`,
            components: [
              {
                type: 1, // Action Row
                components: [
                  {
                    type: 4, // Text Input
                    custom_id: 'character_name',
                    label: 'Your Character Name',
                    style: 1, // Short style
                    placeholder: 'Enter your character\'s name',
                    required: true
                  }
                ]
              },
              {
                type: 1, // Action Row
                components: [
                  {
                    type: 4, // Text Input
                    custom_id: 'share_text',
                    label: 'Share Comment (Optional)',
                    style: 2, // Paragraph style
                    placeholder: 'Add a message when sharing to your story',
                    required: false
                  }
                ]
              }
            ]
          });
        }
        else if (action === 'save') {
          // Just need character name for saving
          await i.showModal({
            title: 'Save to Collection',
            customId: `char_save_${actionPostId}`,
            components: [
              {
                type: 1, // Action Row
                components: [
                  {
                    type: 4, // Text Input
                    custom_id: 'character_name',
                    label: 'Your Character Name',
                    style: 1, // Short style
                    placeholder: 'Enter your character\'s name',
                    required: true
                  }
                ]
              }
            ]
          });
        }
      } catch (error) {
        console.error('Error handling button interaction:', error);
        try {
          await i.reply({ content: `An error occurred: ${error.message}`, ephemeral: true });
        } catch (replyError) {
          console.error('Could not reply with error message:', replyError);
        }
      }
    });
    
    // Set up a separate handler for modal submissions
    const modalHandler = async function(i) {
      // Only process modal submissions that match our post ID
      if (!i.isModalSubmit() || !i.customId.includes(postId)) return;
      
      try {
        // Get the character name from the modal
        const characterName = i.fields.getTextInputValue('character_name');
        
        // Find the character in the database
        let character;
        try {
          character = await characterModel.getCharacterByName(characterName, guildId);
        } catch (error) {
          console.error("Error finding character:", error);
          return await i.reply({ 
            content: `Error finding character "${characterName}". Try again with the exact character name.`,
            ephemeral: true 
          });
        }
        
        if (!character) {
          return await i.reply({ 
            content: `Character "${characterName}" doesn't exist. Make sure you're using their exact name.`,
            ephemeral: true 
          });
        }
        
        // Verify the user owns this character
        if (character.user_id !== i.user.id) {
          return await i.reply({
            content: `You don't own the character "${characterName}". Please use one of your own characters.`,
            ephemeral: true
          });
        }
        
        // Handle different interaction types
        if (i.customId.includes('like')) {
          // Post like notification in the thread with no tagging
          await thread.send({
            content: `**${characterName}** liked this post! ❤️`,
            allowedMentions: { parse: [] }
          });
          
          // Acknowledge to the user
          await i.reply({ 
            content: `${characterName} liked this post!`,
            ephemeral: true
          });
        }
        else if (i.customId.includes('comment')) {
          // Get the comment text
          const commentText = i.fields.getTextInputValue('comment_text');
          
          // Check if this is a reply to someone
          let replyTo = '';
          try {
            replyTo = i.fields.getTextInputValue('reply_to').trim();
          } catch (e) {
            // Reply field is optional, so it might not exist
          }
          
          // Format the description based on whether it's a reply or not
          let description = commentText;
          
          // Look up the Discord user who created the character being replied to
          let mentionedUserId = null;
          if (replyTo) {
            try {
              // Try to find the replied-to character in the database
              const repliedToCharacter = await characterModel.getCharacterByName(replyTo, guildId);
              if (repliedToCharacter && repliedToCharacter.user_id) {
                mentionedUserId = repliedToCharacter.user_id;
                // Add mention format for Discord
                description = `**Replying to @${replyTo.replace(/\s+/g, '_').toLowerCase()}** · ${commentText}`;
              } else {
                // If character not found, still format as reply but don't tag
                description = `**Replying to @${replyTo.replace(/\s+/g, '_').toLowerCase()}** · ${commentText}`;
              }
            } catch (error) {
              console.error("Error finding replied-to character:", error);
              // Still format as reply if lookup fails
              description = `**Replying to @${replyTo.replace(/\s+/g, '_').toLowerCase()}** · ${commentText}`;
            }
          }
          
          // Create an embed for the comment
          const commentEmbed = new EmbedBuilder()
            .setColor('#E1306C')
            .setAuthor({
              name: `${characterName} (@${characterName.replace(/\s+/g, '_').toLowerCase()})`,
              iconURL: character.image_url || null
            })
            .setDescription(description)
            .setTimestamp();
          
          // Create the message content for thread
          let messageContent = '';
          
          // If replying to someone, add a Discord mention
          if (mentionedUserId) {
            messageContent = `<@${mentionedUserId}> your character was mentioned in a reply`;
          }
          
          // Send the comment in thread
          await thread.send({ 
            content: messageContent || null,
            embeds: [commentEmbed],
            allowedMentions: mentionedUserId ? { users: [mentionedUserId] } : { parse: [] }
          });
          
          // Acknowledge to the user
          if (replyTo) {
            await i.reply({
              content: `${characterName} replied to ${replyTo}'s comment!`,
              ephemeral: true
            });
          } else {
            await i.reply({
              content: `${characterName} commented on this post!`,
              ephemeral: true
            });
          }
        }
        else if (i.customId.includes('share')) {
          // Get the share text if provided
          let shareText = '';
          try {
            shareText = i.fields.getTextInputValue('share_text');
          } catch (e) {
            // Share text is optional, so it might not exist
          }
          
          // Create message for sharing
          const shareMessage = shareText ? 
            `**${characterName}** shared this post to their story with message: *"${shareText}"*` :
            `**${characterName}** shared this post to their story!`;
          
          // Send share notification to thread with no tagging
          await thread.send({
            content: shareMessage,
            allowedMentions: { parse: [] }
          });
          
          // Acknowledge to user
          await i.reply({
            content: `${characterName} shared this post to their story!`,
            ephemeral: true
          });
        }
        else if (i.customId.includes('save')) {
          // Send save notification to thread with no tagging
          await thread.send({
            content: `**${characterName}** saved this post to their collection! 🔖`,
            allowedMentions: { parse: [] }
          });
          
          // Acknowledge to user
          await i.reply({
            content: `${characterName} saved this post to their collection!`,
            ephemeral: true
          });
        }
      } catch (error) {
        console.error('Error handling modal submission:', error);
        await i.reply({ 
          content: `An error occurred: ${error.message}`,
          ephemeral: true
        });
      }
    };
    
    // Add the modal handler
    interaction.client.on('interactionCreate', modalHandler);
    
    // Clean up the handler when collector ends
    collector.on('end', () => {
      interaction.client.removeListener('interactionCreate', modalHandler);
    });
    
  } catch (error) {
    console.error('Error in instagramPost command:', error);
    await interaction.reply({ 
      content: `An error occurred: ${error.message}`, 
      ephemeral: true 
    });
  }
}

module.exports = instagramPost;
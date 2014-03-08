#require 'speech'

class HomeController < ApplicationController
  def index
	  @word = Word.order("RANDOM()").first

  end

  def about
  end

  def contact
  end

  private

  # Given a Sound, locate the asset in the file system, convert it to text, and return the text.

  def toText(sound)
    rails_root_dir = Rails.root.to_s
    public_dir = "/public"
    sound_file_dir = sound.to_s
    sound_file_path = rails_root_dir + public_dir + sound_file_dir
    audio = Speech::AudioToText.new(sound_file_path, :verbose => true)
#    text = audio.to_text
#    return text
  end

end
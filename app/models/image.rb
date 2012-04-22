class Image < ActiveRecord::Base
  before_save :remove_main_flag
  named_scope :main, :conditions => ["main = ?", true]
  has_attached_file :picture, 
                    :styles => { :large => "500x500>",
                                 :medium => "300x300>",
                                 :thumb => "100x100>",
                                 :gallery => "250x200" }
  
  def url(size)
    picture.url(size)
  end
  
  def self.first_gallery_image
    Image.order("picture_updated_at desc, created_at desc").find_by_gallery_flag true
  end
  
  private
  
  def remove_main_flag
    Image.update_all [ "main = ? ", false ] , [ "furniture_id = ? AND main = ? AND id != ?", furniture_id, true, ( id || 0 ) ] if main && main_changed?
  end
end

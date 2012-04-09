class Image < ActiveRecord::Base
  before_save :remove_main_flag
  named_scope :main, :conditions => ["main = ?", true]
  has_attached_file :picture, 
                    :styles => { :large => "500x500>",
                                 :medium => "300x300>",
                                 :thumb => "100x100>" }
  
  def url(size)
    picture.url(size)
  end
  
  private
  
  def remove_main_flag
    Image.where(:furniture_id => furniture_id, :main => true).each { |f| f.update_attribute( "main", false ) } if main
  end
end

class Image < ActiveRecord::Base
  named_scope :main, :conditions => ["main = ?", true]
  has_attached_file :picture, 
                    :styles => { :large => "500x500>",
                                 :medium => "300x300>",
                                 :thumb => "100x100>" }
  
  def url(size)
    picture.url(size)
  end
end

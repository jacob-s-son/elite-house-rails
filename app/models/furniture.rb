class Furniture < ActiveRecord::Base
  belongs_to :category
  belongs_to :sub_category
  validates_presence_of :category
  validates_presence_of :sub_category, :if => lambda { |f| f.category.sub_categories.size > 0 }
  after_initialize :set_priority
  
  has_attached_file :image, 
                    :styles => { :large => "500x500>",
                                 :medium => "300x300>",
                                 :thumb => "100x100>" }
  def name
   read_attribute( I18n.locale == 'lv' ? :name : :name_ru ) 
  end
  
  def description
    read_attribute( I18n.locale == 'lv' ? :description_lv : :description_ru ) 
  end
  
  private
  
  def set_priority
    self.priority = Furniture.count unless priority
  end
end

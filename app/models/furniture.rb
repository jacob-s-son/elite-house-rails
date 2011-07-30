class Furniture < ActiveRecord::Base
  belongs_to :category
  belongs_to :sub_category
  validates_presence_of :category
  #validates_presence_of :sub_category, :if => lambda { |f| self.category.sub_categories.size > 0 }
  after_initialize :set_priority
  has_many :images, :dependent => :destroy
  accepts_nested_attributes_for :images, :reject_if => lambda { |t| t['picture'].nil? }, :allow_destroy => true  
  
  def name
   read_attribute( I18n.locale == :lv ? :name : :name_ru ) 
  end
  
  def description
    read_attribute( I18n.locale == :lv ? :description_lv : :description_ru ) 
  end
  
  def self.find_for_index(params)
    if params[:sub_category_id]
      self.where(:sub_category_id => params[:sub_category_id])
    else
      self.where(:category_id => params[:category_id])
    end
  end
  
  def main_image
    images.main.first.picture
  end
  
  private
  
  def set_priority
    self.priority = Furniture.count unless priority
  end
end

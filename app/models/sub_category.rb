class SubCategory < ActiveRecord::Base
  has_many :furniture
  belongs_to :category
  after_initialize :set_pritority
  validates_presence_of :category
  has_attached_file :image, 
                    :styles => { :medium => "300x300>",
                                 :thumb => "100x100>" }
  
  
  def name
    read_attribute( I18n.locale == :lv ? :name : :name_ru ) 
  end
  
  def key
    self.id
  end
  
  private
  
  def set_pritority
    self.priority = SubCategory.count unless priority
  end
  
end
